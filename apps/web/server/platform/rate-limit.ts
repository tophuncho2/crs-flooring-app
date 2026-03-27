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

// Failure policy:
// - Prefer Redis-backed counters when RATE_LIMIT_REDIS_URL is configured and healthy.
// - If Redis is missing, unavailable, or throws during a request, fail open to the
//   process-local fixed-window store for that request.
// - Redis client state is invalidated after command failures so the next request
//   attempts a fresh connection instead of reusing a poisoned client.

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
const RATE_LIMIT_MODULE_ROUTE = "server/platform/rate-limit"

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
        message: "RATE_LIMIT_REDIS_URL is not configured; falling back to process-local rate limiting",
        action: "rateLimit.redis.missing",
        route: RATE_LIMIT_MODULE_ROUTE,
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
        route: RATE_LIMIT_MODULE_ROUTE,
        error,
      })
    })

    client.on("end", () => {
      global.rateLimitRedisClientPromise = undefined
      logEvent({
        level: "warn",
        message: "Redis rate-limit client closed; the next request will reconnect",
        action: "rateLimit.redis.closed",
        route: RATE_LIMIT_MODULE_ROUTE,
      })
    })

    await client.connect()
    return client
  } catch (error) {
    logEvent({
      level: "warn",
      message: "Failed to connect Redis rate-limit client; using process-local fallback",
      action: "rateLimit.redis.connectFailed",
      route: RATE_LIMIT_MODULE_ROUTE,
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

async function invalidateRedisClient() {
  const currentClientPromise = global.rateLimitRedisClientPromise
  global.rateLimitRedisClientPromise = undefined

  if (!currentClientPromise) {
    return
  }

  try {
    const client = await currentClientPromise
    if (client?.isOpen) {
      await client.disconnect()
    }
  } catch {
    // The command path already logs the original Redis failure.
  }
}

async function incrementCounter(scope: string, key: string, windowMs: number) {
  const redisClient = await getRedisClientPromise()

  if (!redisClient) {
    return incrementInMemoryCounter(key, windowMs)
  }

  try {
    const count = await redisClient.incr(key)
    if (count === 1) {
      await redisClient.pExpire(key, windowMs)
    }

    return count
  } catch (error) {
    await invalidateRedisClient()
    logEvent({
      level: "warn",
      message: "Redis rate-limit operation failed; using process-local fallback for this request",
      action: "rateLimit.redis.commandFailed",
      route: RATE_LIMIT_MODULE_ROUTE,
      error,
      details: {
        scope,
        windowMs,
      },
    })

    return incrementInMemoryCounter(key, windowMs)
  }
}

export async function consumeRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const requestId = getRequestId(options.request)
  const clientIp = getClientIp(options.request)
  const identifier = options.identifier?.trim() || clientIp
  const { prefix } = getRateLimitEnvironment()
  const key = `${prefix}:${options.scope}:${identifier}`
  const count = await incrementCounter(options.scope, key, options.windowMs)
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
