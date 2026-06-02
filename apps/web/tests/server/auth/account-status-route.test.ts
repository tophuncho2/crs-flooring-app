import { describe, expect, it, vi } from "vitest"

const {
  getAuthAccountStatusUseCaseMock,
  consumeRateLimitMock,
  buildRateLimitResponseMock,
} = vi.hoisted(() => ({
  getAuthAccountStatusUseCaseMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
  buildRateLimitResponseMock: vi.fn(),
}))

vi.mock("@builders/application", async () => {
  const actual = await vi.importActual<typeof import("@builders/application")>("@builders/application")
  return {
    ...actual,
    getAuthAccountStatusUseCase: getAuthAccountStatusUseCaseMock,
  }
})

vi.mock("@/server/platform/rate-limit", () => ({
  consumeRateLimit: consumeRateLimitMock,
  buildRateLimitResponse: buildRateLimitResponseMock,
}))

vi.mock("@/server/platform/logger", () => ({
  logEvent: vi.fn(),
}))

const { POST } = await import("@/app/api/auth/account-status/route")

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/auth/account-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/auth/account-status", () => {
  it("returns the resolved account status", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true })
    getAuthAccountStatusUseCaseMock.mockResolvedValue({ status: "needs-password" })

    const response = await POST(makeRequest({ email: "user@test.com" }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.status).toBe("needs-password")
    expect(getAuthAccountStatusUseCaseMock).toHaveBeenCalledWith({ email: "user@test.com" })
  })

  it("returns needs-setup status", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true })
    getAuthAccountStatusUseCaseMock.mockResolvedValue({ status: "needs-setup" })

    const response = await POST(makeRequest({ email: "new@test.com" }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.status).toBe("needs-setup")
  })

  it("rejects missing email", async () => {
    consumeRateLimitMock.mockResolvedValue({ allowed: true })

    const response = await POST(makeRequest({}))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBeDefined()
  })

  it("returns 429 when rate limited", async () => {
    const rateLimitResponse = Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    )
    consumeRateLimitMock.mockResolvedValue({ allowed: false })
    buildRateLimitResponseMock.mockReturnValue(rateLimitResponse)

    const response = await POST(makeRequest({ email: "user@test.com" }))
    const payload = await response.json()

    expect(response.status).toBe(429)
    expect(payload.error).toMatch(/Too many requests/)
  })
})
