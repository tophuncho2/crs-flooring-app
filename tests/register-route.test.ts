import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  hashMock,
  getSessionUserMock,
  logEventMock,
  consumeRateLimitMock,
  buildRateLimitResponseMock,
  getRequestIdMock,
  getClientIpMock,
  userFindUniqueMock,
  userCountMock,
  userCreateMock,
} = vi.hoisted(() => ({
  hashMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  logEventMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
  buildRateLimitResponseMock: vi.fn(),
  getRequestIdMock: vi.fn(),
  getClientIpMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userCountMock: vi.fn(),
  userCreateMock: vi.fn(),
}))

vi.mock("bcrypt", () => ({
  default: {
    hash: hashMock,
  },
}))

vi.mock("@/server/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}))

vi.mock("@/server/platform/logger", () => ({
  logEvent: logEventMock,
}))

vi.mock("@/server/platform/rate-limit", () => ({
  consumeRateLimit: consumeRateLimitMock,
  buildRateLimitResponse: buildRateLimitResponseMock,
}))

vi.mock("@/server/platform/request-context", async () => {
  const actual = await vi.importActual<typeof import("@/server/platform/request-context")>("@/server/platform/request-context")
  return {
    ...actual,
    getRequestId: getRequestIdMock,
    getClientIp: getClientIpMock,
  }
})

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUniqueMock,
      count: userCountMock,
      create: userCreateMock,
    },
  },
}))

const { POST } = await import("@/app/api/auth/register/route")

describe("register route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hashMock.mockResolvedValue("hashed-password")
    getSessionUserMock.mockResolvedValue(null)
    consumeRateLimitMock.mockResolvedValue({
      allowed: true,
      count: 1,
      limit: 5,
      retryAfterSeconds: 60,
      requestId: "req-1",
      clientIp: "127.0.0.1",
    })
    buildRateLimitResponseMock.mockReturnValue(new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }))
    getRequestIdMock.mockReturnValue("req-1")
    getClientIpMock.mockReturnValue("127.0.0.1")
    userFindUniqueMock.mockResolvedValue(null)
  })

  it("bootstraps the first account as a verified owner", async () => {
    userCountMock.mockResolvedValue(0)
    userCreateMock.mockResolvedValue({ id: "user-1", role: "OWNER", isVerified: true })

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@test.com", password: "password123" }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(userCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "OWNER",
          isVerified: true,
        }),
      }),
    )
    expect(payload.message).toBe("Initial owner account created.")
  })

  it("creates an unverified builder request for public signups after bootstrap", async () => {
    userCountMock.mockResolvedValue(1)
    userCreateMock.mockResolvedValue({ id: "user-2", role: "BUILDER", isVerified: false })

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "builder@test.com", password: "password123" }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(userCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "BUILDER",
          isVerified: false,
        }),
      }),
    )
    expect(payload.message).toBe("Account request created. Pending approval.")
  })

  it("lets an admin create a verified builder account", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      isVerified: true,
    })
    userCountMock.mockResolvedValue(1)
    userCreateMock.mockResolvedValue({ id: "user-3", role: "BUILDER", isVerified: true })

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "new-builder@test.com",
          password: "password123",
          role: "BUILDER",
          isVerified: true,
        }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(userCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "BUILDER",
          isVerified: true,
        }),
      }),
    )
    expect(payload.message).toBe("Builder account created.")
  })

  it("does not allow governance users to create elevated roles through the web route", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "owner-1",
      email: "owner@test.com",
      role: "OWNER",
      isVerified: true,
    })
    userCountMock.mockResolvedValue(2)

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "new-admin@test.com",
          password: "password123",
          role: "ADMIN",
        }),
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("Only builder accounts can be created from this route")
    expect(userCreateMock).not.toHaveBeenCalled()
  })

  it("returns 409 when the account already exists", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "user-9" })

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@test.com", password: "password123" }),
      }),
    )

    expect(response.status).toBe(409)
    expect(userCreateMock).not.toHaveBeenCalled()
  })

  it("returns the shared rate-limit response when blocked", async () => {
    consumeRateLimitMock.mockResolvedValue({
      allowed: false,
      count: 6,
      limit: 5,
      retryAfterSeconds: 60,
      requestId: "req-1",
      clientIp: "127.0.0.1",
    })

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@test.com", password: "password123" }),
      }),
    )

    expect(response.status).toBe(429)
    expect(buildRateLimitResponseMock).toHaveBeenCalled()
  })
})
