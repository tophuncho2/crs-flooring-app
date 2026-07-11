import { beforeEach, describe, expect, it, vi } from "vitest"

// Golden-master for the non-standard products/[id]/indicators POST: the use-case
// result is returned BARE (not wrapped in a `{ indicator }` envelope), status is
// 200 (not 201), and entityId is the parent productId.

const {
  createIndicatorUseCaseMock,
  applyRoutePolicyMock,
  enforceMutationReceiptMock,
  finalizeMutationReceiptMock,
  withMutationTelemetryMock,
  telemetryCalls,
} = vi.hoisted(() => ({
  createIndicatorUseCaseMock: vi.fn(),
  applyRoutePolicyMock: vi.fn(),
  enforceMutationReceiptMock: vi.fn(),
  finalizeMutationReceiptMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
  telemetryCalls: [] as Array<Record<string, unknown>>,
}))

vi.mock("@builders/application", async () => {
  const actual = await vi.importActual<typeof import("@builders/application")>("@builders/application")
  return { ...actual, createIndicatorUseCase: createIndicatorUseCaseMock }
})

vi.mock("@/server/http/route-policy", async () => {
  const actual = await vi.importActual<typeof import("@/server/http/route-policy")>("@/server/http/route-policy")
  return {
    ...actual,
    applyRoutePolicy: applyRoutePolicyMock,
    enforceMutationReceipt: enforceMutationReceiptMock,
    finalizeMutationReceipt: finalizeMutationReceiptMock,
  }
})

vi.mock("@/server/telemetry/mutation-telemetry", () => ({
  withMutationTelemetry: withMutationTelemetryMock,
}))

vi.mock("@/server/platform/logger", () => ({ logEvent: vi.fn() }))

const { POST } = await import("@/app/api/products/[id]/indicators/route")

const PRODUCT_ID = "22222222-2222-4222-8222-222222222222"

beforeEach(() => {
  vi.clearAllMocks()
  telemetryCalls.length = 0
  applyRoutePolicyMock.mockResolvedValue({
    requestId: "req-1",
    clientIp: "127.0.0.1",
    user: { id: "admin-1", email: "admin@test.com", rank: "DEVELOPER" },
  })
  enforceMutationReceiptMock.mockResolvedValue({ replay: null, requestHash: "hash-1" })
  finalizeMutationReceiptMock.mockResolvedValue(undefined)
  withMutationTelemetryMock.mockImplementation(
    async (_ctx: unknown, options: Record<string, unknown>, operation: () => Promise<unknown>) => {
      telemetryCalls.push(options)
      return operation()
    },
  )
})

describe("POST /api/products/[id]/indicators", () => {
  it("returns 200 with the bare use-case result and parent entityId", async () => {
    createIndicatorUseCaseMock.mockResolvedValue({ indicator: { id: "ind-1" }, product: { id: PRODUCT_ID } })

    const response = await POST(
      new Request(`http://localhost/api/products/${PRODUCT_ID}/indicators`, {
        method: "POST",
        body: JSON.stringify({
          warehouseId: "w1",
          unitId: "u1",
          lowStockThreshold: "5",
          isActive: true,
          mutation: { idempotencyKey: "idem-1" },
        }),
      }),
      { params: Promise.resolve({ id: PRODUCT_ID }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    // Bare body — NOT wrapped in { indicator }.
    expect(payload).toEqual({ indicator: { id: "ind-1" }, product: { id: PRODUCT_ID } })
    expect(createIndicatorUseCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({ productId: PRODUCT_ID, warehouseId: "w1", unitId: "u1" }),
      "admin@test.com",
    )
    expect(finalizeMutationReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "products.indicators.create", responseStatus: 200 }),
    )
    expect(telemetryCalls[0]).toMatchObject({
      action: "products.indicators.create",
      entityType: "flooringProduct",
      entityId: PRODUCT_ID,
    })
  })
})
