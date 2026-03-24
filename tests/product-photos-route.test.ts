import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  authorizeProductsRouteMock,
  enforceRouteRateLimitMock,
  uploadFileToBucketMock,
  withMutationTelemetryMock,
} = vi.hoisted(() => ({
  authorizeProductsRouteMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  uploadFileToBucketMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(async (_context, _options, operation: () => Promise<unknown>) => operation()),
}))

const routeAccess = {
  requestId: "req-1",
  user: {
    id: "user-1",
    email: "builder@example.com",
    role: "BUILDER",
    isVerified: true,
    tools: [],
  },
  clientIp: "127.0.0.1",
} as const

vi.mock("@/features/flooring/shared/access/domain-tools", () => ({
  authorizeProductsRoute: authorizeProductsRouteMock,
}))

vi.mock("@/features/flooring/shared/application/mutation-telemetry", () => ({
  withMutationTelemetry: withMutationTelemetryMock,
}))

vi.mock("@/server/http/route-helpers", () => ({
  enforceRouteRateLimit: enforceRouteRateLimitMock,
  routeJson: vi.fn((_context, body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 })),
}))

vi.mock("@/server/storage/s3", () => ({
  uploadFileToBucket: uploadFileToBucketMock,
}))

const { POST } = await import("@/app/api/flooring/product-photos/route")

describe("product photo upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeProductsRouteMock.mockResolvedValue(routeAccess)
    enforceRouteRateLimitMock.mockResolvedValue(null)
  })

  it("returns 500 when storage upload fails after request validation succeeds", async () => {
    uploadFileToBucketMock.mockRejectedValue(new Error("S3 unavailable"))

    const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
    const formData = new FormData()
    formData.set("file", new File([pngBytes], "photo.png", { type: "image/png" }))

    const response = await POST(
      new Request("http://localhost/api/flooring/product-photos", {
        method: "POST",
        body: formData,
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload.error).toBe("S3 unavailable")
    expect(withMutationTelemetryMock).toHaveBeenCalled()
    expect(uploadFileToBucketMock).toHaveBeenCalled()
  })
})
