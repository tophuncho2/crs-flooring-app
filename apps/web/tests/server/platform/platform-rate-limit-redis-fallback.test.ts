import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("consumeRateLimit Redis fallback", () => {
  const createClientMock = vi.fn()
  const logEventMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.RATE_LIMIT_REDIS_URL
    process.env.REDIS_URL = "redis://localhost:6379"
    delete process.env.RATE_LIMIT_PREFIX

    vi.doMock("redis", () => ({
      createClient: createClientMock,
    }))

    vi.doMock("@/server/platform/logger", () => ({
      logEvent: logEventMock,
    }))
  })

  afterEach(() => {
    delete process.env.RATE_LIMIT_REDIS_URL
    delete process.env.REDIS_URL
    delete process.env.RATE_LIMIT_PREFIX
    vi.resetModules()
    vi.doUnmock("redis")
    vi.doUnmock("@/server/platform/logger")
  })

  it("falls back to the local store when a Redis command fails and reconnects on the next request", async () => {
    const failingClient = {
      isOpen: true,
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      incr: vi.fn().mockRejectedValue(new Error("redis down")),
      pExpire: vi.fn(),
      disconnect: vi.fn().mockResolvedValue(undefined),
    }

    const recoveredClient = {
      isOpen: true,
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      incr: vi.fn().mockResolvedValue(1),
      pExpire: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    }

    createClientMock
      .mockReturnValueOnce(failingClient)
      .mockReturnValueOnce(recoveredClient)

    const rateLimitModule = await import("@/server/platform/rate-limit")
    rateLimitModule.resetRateLimitStateForTests()

    const first = await rateLimitModule.consumeRateLimit({
      request: new Request("http://localhost/api/test", {
        headers: {
          "x-forwarded-for": "127.0.0.1",
        },
      }),
      scope: "auth.login",
      limit: 2,
      windowMs: 60_000,
      route: "/api/test",
    })

    const second = await rateLimitModule.consumeRateLimit({
      request: new Request("http://localhost/api/test", {
        headers: {
          "x-forwarded-for": "127.0.0.1",
        },
      }),
      scope: "auth.login",
      limit: 2,
      windowMs: 60_000,
      route: "/api/test",
    })

    expect(first.allowed).toBe(true)
    expect(first.count).toBe(1)
    expect(second.allowed).toBe(true)
    expect(second.count).toBe(1)
    expect(createClientMock).toHaveBeenCalledTimes(2)
    expect(failingClient.disconnect).toHaveBeenCalledTimes(1)
    expect(logEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "warn",
        action: "rateLimit.redis.commandFailed",
      }),
    )
  })
})
