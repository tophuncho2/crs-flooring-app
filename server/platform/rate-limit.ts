import { NextResponse } from "next/server"
import { createClient } from "redis"
import { getRateLimitEnvironment } from "@/server/platform/env"
import { logEvent } from "@/server/platform/logger"
import {
  getClientIp,
  getRequestId,
  REQUEST_ID_HEADER,
  type HeaderCarrier,
} from "@/server/platform/request-context"

type RateLimitOptions = {
  request?: HeaderCarrier
  scope: string
  identifier?: string
  limit: number
  windowMs: number
  route: string
  userId?: string
  userEmail?: string
}

type RateLimitResult = {
  allowed: boolean
  count: number
  limit: number
  retryAfterSeconds: number
  requestId: string
  clientIp: string
}

type MemoryCounter = {
  count: number
  expiresAt: number
}

type RateLimitRedisClient = ReturnType<typeof createClient>

declare global {
  var rateLimitRedisClientPromise: Promise<RateLimitRedisClient | null> | undefined
}

const memoryCounters = new Map<string, MemoryCounter>()
let hasWarnedMissingRedis = false

function incrementInMemoryCounter(key: string, windowMs: number) {
  const now = Date.now()
  const existing = memoryCounters.get(key)

  if (!existing || existing.expiresAt <= now) {
    memoryCounters.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    })
    return 1
  }

  existing.count += 1
  memoryCounters.set(key, existing)
  return existing.count
}

async function connectRedisClient() {
  const { redisUrl } = getRateLimitEnvironment()

  if (!redisUrl) {
    if (process.env.NODE_ENV === "production" && !hasWarnedMissingRedis) {
      hasWarnedMissingRedis = true
      logEvent({
        level: "warn",
        message: "REDIS_URL is not configured; falling back to process-local rate limiting",
        action: "rateLimit.redis.missing",
        route: "server/platform/rate-limit",
      })
    }

    return null
  }

  try {
    const client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: false,
      },
    })

    client.on("error", (error) => {
      logEvent({
        level: "warn",
        message: "Redis rate-limit client emitted an error",
        action: "rateLimit.redis.error",
        route: "server/platform/rate-limit",
        error,
      })
    })

    await client.connect()
    return client
  } catch (error) {
    logEvent({
      level: "warn",
      message: "Failed to connect Redis rate-limit client; using process-local fallback",
      action: "rateLimit.redis.connectFailed",
      route: "server/platform/rate-limit",
      error,
    })
    return null
  }
}

function getRedisClientPromise() {
  if (!global.rateLimitRedisClientPromise) {
    global.rateLimitRedisClientPromise = connectRedisClient()
  }

  return global.rateLimitRedisClientPromise
}

async function incrementCounter(key: string, windowMs: number) {
  const redisClient = await getRedisClientPromise()

  if (!redisClient) {
    return incrementInMemoryCounter(key, windowMs)
  }

  const count = await redisClient.incr(key)
  if (count === 1) {
    await redisClient.pExpire(key, windowMs)
  }

  return count
}

export async function consumeRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const requestId = getRequestId(options.request)
  const clientIp = getClientIp(options.request)
  const identifier = options.identifier?.trim() || clientIp
  const { prefix } = getRateLimitEnvironment()
  const key = `${prefix}:${options.scope}:${identifier}`
  const count = await incrementCounter(key, options.windowMs)
  const retryAfterSeconds = Math.max(1, Math.ceil(options.windowMs / 1000))

  if (count > options.limit) {
    logEvent({
      level: "warn",
      message: "Rate limit exceeded",
      action: "rateLimit.exceeded",
      route: options.route,
      requestId,
      userId: options.userId,
      userEmail: options.userEmail,
      clientIp,
      details: {
        scope: options.scope,
        limit: options.limit,
        count,
      },
    })
  }

  return {
    allowed: count <= options.limit,
    count,
    limit: options.limit,
    retryAfterSeconds,
    requestId,
    clientIp,
  }
}

export function buildRateLimitResponse(result: RateLimitResult, message = "Too many requests. Please try again later.") {
  const response = NextResponse.json(
    {
      error: message,
    },
    { status: 429 },
  )

  response.headers.set(REQUEST_ID_HEADER, result.requestId)
  response.headers.set("Retry-After", String(result.retryAfterSeconds))
  response.headers.set("X-RateLimit-Limit", String(result.limit))
  response.headers.set("X-RateLimit-Remaining", String(Math.max(result.limit - result.count, 0)))

  return response
}

export function resetRateLimitStateForTests() {
  memoryCounters.clear()
  hasWarnedMissingRedis = false
  global.rateLimitRedisClientPromise = undefined
}
