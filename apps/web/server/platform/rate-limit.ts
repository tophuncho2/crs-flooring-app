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
// When the configured Redis host is unreachable (e.g. a Railway-internal URL from
// an environment that can't resolve it) we must not re-attempt the connection on
// every rate-limited request — that thrash is what spammed the logs with an error
// + stack on every login. Cache the unavailability for a cooldown and warn once.
let redisUnavailableUntil = 0
let hasWarnedRedisUnavailable = false
const REDIS_UNAVAILABLE_COOLDOWN_MS = 60_000
const RATE_LIMIT_MODULE_ROUTE = "server/platform/rate-limit"

function noteRedisUnavailable(action: string, message: string, error?: unknown) {
  redisUnavailableUntil = Date.now() + REDIS_UNAVAILABLE_COOLDOWN_MS
  if (hasWarnedRedisUnavailable) {
    return
  }
  hasWarnedRedisUnavailable = true
  logEvent({
    level: "warn",
    message,
    action,
    route: RATE_LIMIT_MODULE_ROUTE,
    error,
  })
}

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

  let wasReady = false

  try {
    const client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: false,
      },
    })

    client.on("ready", () => {
      const reconnected = wasReady
      wasReady = true
      hasWarnedRedisUnavailable = false
      redisUnavailableUntil = 0
      // Positive confirmation that rate limiting is Redis-backed, not the
      // process-local fallback — so "no error" in the logs isn't the only signal.
      logEvent({
        level: "info",
        message: reconnected
          ? "Redis rate-limit client reconnected"
          : "Redis rate-limit client connected",
        action: "rateLimit.redis.connected",
        route: RATE_LIMIT_MODULE_ROUTE,
      })
    })

    client.on("error", (error) => {
      noteRedisUnavailable(
        "rateLimit.redis.error",
        "Redis rate-limit client unavailable; using process-local rate limiting",
        error,
      )
    })

    client.on("end", () => {
      // Only a previously-healthy connection should arm a reconnect. A client that
      // never reached "ready" stays cached as unavailable so the next request uses
      // the process-local fallback instead of re-dialing an unreachable host.
      if (!wasReady) {
        return
      }
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
    noteRedisUnavailable(
      "rateLimit.redis.connectFailed",
      "Failed to connect Redis rate-limit client; using process-local fallback",
      error,
    )
    return null
  }
}

function getRedisClientPromise() {
  if (!global.rateLimitRedisClientPromise) {
    // Inside the cooldown after a failed connect, skip Redis entirely — return a
    // resolved null so callers fall through to the in-memory counter without
    // re-dialing (and re-logging) an unreachable host on every request.
    if (Date.now() < redisUnavailableUntil) {
      return Promise.resolve<RateLimitRedisClient | null>(null)
    }
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

// ── Better Auth rate-limit storage ──────────────────────────────────────────
// Better Auth's auth routes (/api/auth/*) are served by its own handler, outside
// the canonical API gauntlet, so Better Auth's built-in limiter is the only thing
// guarding sign-in/OAuth. By default that limiter keeps counters in process memory
// — per-instance and wiped on every restart/redeploy. This adapter backs it with
// the SAME Redis-or-memory store as the gauntlet limiter above, so auth rate
// limiting is durable and shared across web instances.
//
// Better Auth uses the atomic `consume` whenever it is defined; `get`/`set` exist
// only to satisfy the storage interface's legacy non-atomic fallback and are never
// reached while `consume` is present (verified in better-auth's rate-limiter).
const AUTH_RATE_LIMIT_SCOPE = "better-auth"
// TTL for the legacy `set` path only — the live `consume` path derives its own TTL
// from each rule's window. Mirrors better-auth's 10s default window.
const AUTH_RATE_LIMIT_FALLBACK_WINDOW_MS = 10_000

function readMemoryCounter(key: string) {
  const entry = memoryCounters.get(key)
  if (!entry || entry.expiresAt <= Date.now()) {
    return null
  }
  return entry.count
}

async function readCounterValue(key: string): Promise<number | null> {
  const redisClient = await getRedisClientPromise()
  if (!redisClient) {
    return readMemoryCounter(key)
  }

  try {
    const raw = await redisClient.get(key)
    return raw == null ? null : Number.parseInt(raw, 10)
  } catch {
    await invalidateRedisClient()
    return readMemoryCounter(key)
  }
}

async function writeCounterValue(key: string, count: number, windowMs: number): Promise<void> {
  const redisClient = await getRedisClientPromise()
  if (!redisClient) {
    memoryCounters.set(key, { count, expiresAt: Date.now() + windowMs })
    return
  }

  try {
    await redisClient.set(key, String(count), { PX: windowMs })
  } catch {
    await invalidateRedisClient()
    memoryCounters.set(key, { count, expiresAt: Date.now() + windowMs })
  }
}

// Built once at Better Auth init and reused per request. Wires Better Auth's
// `rateLimit.customStorage` to our Redis/in-memory counters under a dedicated
// key namespace so its keys never collide with the gauntlet limiter's.
export function createAuthRateLimitStorage() {
  const { prefix } = getRateLimitEnvironment()
  const namespacedKey = (key: string) => `${prefix}:${AUTH_RATE_LIMIT_SCOPE}:${key}`

  return {
    async get(key: string) {
      const count = await readCounterValue(namespacedKey(key))
      return count === null ? null : { key, count, lastRequest: Date.now() }
    },
    async set(key: string, value: { key: string; count: number; lastRequest: number }) {
      await writeCounterValue(namespacedKey(key), value.count, AUTH_RATE_LIMIT_FALLBACK_WINDOW_MS)
    },
    async consume(key: string, rule: { window: number; max: number }) {
      const windowMs = Math.max(1, Math.ceil(rule.window)) * 1000
      const count = await incrementCounter(AUTH_RATE_LIMIT_SCOPE, namespacedKey(key), windowMs)
      return count <= rule.max
        ? { allowed: true, retryAfter: null }
        : { allowed: false, retryAfter: rule.window }
    },
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
  redisUnavailableUntil = 0
  hasWarnedRedisUnavailable = false
  global.rateLimitRedisClientPromise = undefined
}
