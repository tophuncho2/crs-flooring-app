import { beforeEach, describe, expect, it } from "vitest"
import {
  buildRateLimitResponse,
  consumeRateLimit,
  createAuthRateLimitStorage,
  resetRateLimitStateForTests,
} from "@/server/platform/rate-limit"

describe("consumeRateLimit", () => {
  beforeEach(() => {
    delete process.env.RATE_LIMIT_REDIS_URL
    delete process.env.REDIS_URL
    delete process.env.RATE_LIMIT_PREFIX
    resetRateLimitStateForTests()
  })

  it("enforces a fixed window in the process-local fallback store", async () => {
    const request = new Request("http://localhost/api/test", {
      headers: {
        "x-forwarded-for": "127.0.0.1",
      },
    })

    const first = await consumeRateLimit({
      request,
      scope: "auth.login",
      limit: 2,
      windowMs: 60_000,
      route: "/api/test",
    })
    const second = await consumeRateLimit({
      request,
      scope: "auth.login",
      limit: 2,
      windowMs: 60_000,
      route: "/api/test",
    })
    const third = await consumeRateLimit({
      request,
      scope: "auth.login",
      limit: 2,
      windowMs: 60_000,
      route: "/api/test",
    })

    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(true)
    expect(third.allowed).toBe(false)
    expect(third.count).toBe(3)
  })

  it("builds a standard 429 response with rate-limit headers", async () => {
    const result = await consumeRateLimit({
      request: new Request("http://localhost/api/test"),
      scope: "auth.register",
      limit: 0,
      windowMs: 60_000,
      route: "/api/test",
    })

    const response = buildRateLimitResponse(result)
    const payload = await response.json()

    expect(response.status).toBe(429)
    expect(payload.error).toBe("Too many requests. Please try again later.")
    expect(response.headers.get("retry-after")).toBe("60")
    expect(response.headers.get("x-request-id")).toBeTruthy()
  })
})

describe("createAuthRateLimitStorage", () => {
  beforeEach(() => {
    delete process.env.RATE_LIMIT_REDIS_URL
    delete process.env.REDIS_URL
    delete process.env.RATE_LIMIT_PREFIX
    resetRateLimitStateForTests()
  })

  it("atomically consumes a fixed window in the process-local fallback store", async () => {
    const storage = createAuthRateLimitStorage()
    const rule = { window: 10, max: 2 }

    const first = await storage.consume("1.2.3.4|/sign-in", rule)
    const second = await storage.consume("1.2.3.4|/sign-in", rule)
    const third = await storage.consume("1.2.3.4|/sign-in", rule)

    expect(first).toEqual({ allowed: true, retryAfter: null })
    expect(second).toEqual({ allowed: true, retryAfter: null })
    expect(third).toEqual({ allowed: false, retryAfter: 10 })
  })

  it("isolates counters per key", async () => {
    const storage = createAuthRateLimitStorage()
    const rule = { window: 10, max: 1 }

    await storage.consume("1.2.3.4|/sign-in", rule)
    const otherIp = await storage.consume("5.6.7.8|/sign-in", rule)

    expect(otherIp.allowed).toBe(true)
  })
})
