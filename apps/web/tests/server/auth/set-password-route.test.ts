import { describe, expect, it, vi } from "vitest"
import { GovernanceExecutionError } from "@builders/application"

const {
  setUserPasswordUseCaseMock,
  consumeRateLimitMock,
  buildRateLimitResponseMock,
} = vi.hoisted(() => ({
  setUserPasswordUseCaseMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
  buildRateLimitResponseMock: vi.fn(),
}))

vi.mock("@builders/application", async () => {
  const actual = await vi.importActual<typeof import("@builders/application")>("@builders/application")
  return {
    ...actual,
    setUserPasswordUseCase: setUserPasswordUseCaseMock,
  }
})

vi.mock("@/server/platform/rate-limit", () => ({
  consumeRateLimit: consumeRateLimitMock,
  buildRateLimitResponse: buildRateLimitResponseMock,
}))

vi.mock("@/server/platform/logger", () => ({
  logEvent: vi.fn(),
}))

const { POST } = await import("@/app/api/auth/set-password/route")

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/auth/set-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/auth/set-password", () => {
  it("sets password successfully", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true })
    setUserPasswordUseCaseMock.mockResolvedValue({ ok: true })

    const response = await POST(makeRequest({ email: "user@test.com", password: "securepass123" }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(setUserPasswordUseCaseMock).toHaveBeenCalledWith({
      email: "user@test.com",
      password: "securepass123",
    })
  })

  it("rejects short password", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true })

    const response = await POST(makeRequest({ email: "user@test.com", password: "short" }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toMatch(/at least 8 characters/)
  })

  it("rejects missing email", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true })

    const response = await POST(makeRequest({ password: "securepass123" }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBeDefined()
  })

  it("rejects missing password", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true })

    const response = await POST(makeRequest({ email: "user@test.com" }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBeDefined()
  })

  it("returns 409 when password already set", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true })
    setUserPasswordUseCaseMock.mockRejectedValue(
      new GovernanceExecutionError({
        code: "GOVERNANCE_PASSWORD_ALREADY_SET",
        message: "Password has already been set for this account",
        status: 409,
      }),
    )

    const response = await POST(makeRequest({ email: "user@test.com", password: "securepass123" }))
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Password has already been set for this account")
  })

  it("returns 404 when user not found", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true })
    setUserPasswordUseCaseMock.mockRejectedValue(
      new GovernanceExecutionError({
        code: "GOVERNANCE_USER_NOT_FOUND",
        message: "Unable to set password for this account",
        status: 404,
      }),
    )

    const response = await POST(makeRequest({ email: "missing@test.com", password: "securepass123" }))
    const payload = await response.json()

    expect(response.status).toBe(404)
    expect(payload.error).toBe("Unable to set password for this account")
  })

  it("returns 429 when rate limited", async () => {
    const rateLimitResponse = Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    )
    consumeRateLimitMock.mockResolvedValue({ allowed: false })
    buildRateLimitResponseMock.mockReturnValue(rateLimitResponse)

    const response = await POST(makeRequest({ email: "user@test.com", password: "securepass123" }))
    const payload = await response.json()

    expect(response.status).toBe(429)
    expect(payload.error).toMatch(/Too many requests/)
  })
})
