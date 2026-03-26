import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET as GET_INVOICE, POST as POST_INVOICE } from "@/app/api/flooring/work-orders/[id]/invoice/route"
import { GET as GET_INVOICE_DOWNLOAD } from "@/app/api/flooring/work-orders/[id]/invoice/download/route"

const {
  authorizeWorkOrdersRouteMock,
  enforceRouteRateLimitMock,
  queueWorkOrderInvoiceUseCaseMock,
  getWorkOrderInvoiceStatusUseCaseMock,
  withMutationTelemetryMock,
  buildBucketObjectUrlForKeyMock,
} = vi.hoisted(() => ({
  authorizeWorkOrdersRouteMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  queueWorkOrderInvoiceUseCaseMock: vi.fn(),
  getWorkOrderInvoiceStatusUseCaseMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
  buildBucketObjectUrlForKeyMock: vi.fn(),
}))

vi.mock("@/features/flooring/shared/access/templates-work-orders", () => ({
  authorizeWorkOrdersRoute: authorizeWorkOrdersRouteMock,
}))

vi.mock("@/server/http/route-helpers", () => ({
  enforceRouteRateLimit: enforceRouteRateLimitMock,
  routeJson: (_access: unknown, body: unknown, init?: ResponseInit) => Response.json(body, init),
  routeError: (_access: unknown, error: unknown) => {
    const maybeError = error as { message?: unknown; status?: unknown }
    return Response.json(
      { error: typeof maybeError.message === "string" ? maybeError.message : "Unexpected server error" },
      { status: typeof maybeError.status === "number" ? maybeError.status : 500 },
    )
  },
}))

vi.mock("@/features/flooring/shared/application/mutation-telemetry", () => ({
  withMutationTelemetry: withMutationTelemetryMock,
}))

vi.mock("@/features/flooring/work-orders/application/invoice", () => ({
  queueWorkOrderInvoiceUseCase: queueWorkOrderInvoiceUseCaseMock,
  getWorkOrderInvoiceStatusUseCase: getWorkOrderInvoiceStatusUseCaseMock,
}))

vi.mock("@/server/storage/s3", () => ({
  buildBucketObjectUrlForKey: buildBucketObjectUrlForKeyMock,
}))

describe("work-order invoice routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeWorkOrdersRouteMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: { id: "user-1", email: "owner@test.com" },
    })
    enforceRouteRateLimitMock.mockResolvedValue(null)
    withMutationTelemetryMock.mockImplementation(async (_access, _event, operation) => operation())
  })

  it("returns the current invoice status", async () => {
    getWorkOrderInvoiceStatusUseCaseMock.mockResolvedValue({
      workOrderId: "wo-1",
      invoiceSourceUpdatedAt: "2026-03-26T12:00:00.000Z",
      invoiceStatus: "READY",
      invoiceFileKey: "invoices/wo-1/invoice.pdf",
      invoiceRequestedAt: "2026-03-26T12:00:00.000Z",
      invoiceGeneratedAt: "2026-03-26T12:01:00.000Z",
      invoiceFailedAt: null,
      invoiceError: null,
      invoiceIdempotencyKey: "invoice-key",
    })

    const response = await GET_INVOICE(new Request("http://localhost/api/flooring/work-orders/wo-1/invoice"), {
      params: Promise.resolve({ id: "wo-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.invoice).toEqual({
      status: "READY",
      canOpen: true,
      requestedAt: "2026-03-26T12:00:00.000Z",
      generatedAt: "2026-03-26T12:01:00.000Z",
      failedAt: null,
      error: "",
      downloadUrl: "/api/flooring/work-orders/wo-1/invoice/download",
    })
  })

  it("queues invoice generation through the use case", async () => {
    queueWorkOrderInvoiceUseCaseMock.mockResolvedValue({
      workOrderId: "wo-1",
      invoiceSourceUpdatedAt: "2026-03-26T12:00:00.000Z",
      invoiceStatus: "QUEUED",
      invoiceFileKey: null,
      invoiceRequestedAt: "2026-03-26T12:00:00.000Z",
      invoiceGeneratedAt: null,
      invoiceFailedAt: null,
      invoiceError: null,
      invoiceIdempotencyKey: "invoice-key",
    })

    const response = await POST_INVOICE(new Request("http://localhost/api/flooring/work-orders/wo-1/invoice", {
      method: "POST",
    }), {
      params: Promise.resolve({ id: "wo-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(queueWorkOrderInvoiceUseCaseMock).toHaveBeenCalledWith("wo-1", "user-1")
    expect(payload.invoice.status).toBe("QUEUED")
    expect(payload.invoice.canOpen).toBe(false)
  })

  it("returns 409 when the invoice is not ready yet", async () => {
    getWorkOrderInvoiceStatusUseCaseMock.mockResolvedValue({
      workOrderId: "wo-1",
      invoiceSourceUpdatedAt: "2026-03-26T12:00:00.000Z",
      invoiceStatus: "PROCESSING",
      invoiceFileKey: null,
      invoiceRequestedAt: "2026-03-26T12:00:00.000Z",
      invoiceGeneratedAt: null,
      invoiceFailedAt: null,
      invoiceError: null,
      invoiceIdempotencyKey: "invoice-key",
    })

    const response = await GET_INVOICE_DOWNLOAD(new Request("http://localhost/api/flooring/work-orders/wo-1/invoice/download"), {
      params: Promise.resolve({ id: "wo-1" }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Invoice is not ready yet")
  })

  it("redirects to the invoice file when it exists", async () => {
    getWorkOrderInvoiceStatusUseCaseMock.mockResolvedValue({
      workOrderId: "wo-1",
      invoiceSourceUpdatedAt: "2026-03-26T12:00:00.000Z",
      invoiceStatus: "READY",
      invoiceFileKey: "invoices/wo-1/invoice.pdf",
      invoiceRequestedAt: "2026-03-26T12:00:00.000Z",
      invoiceGeneratedAt: "2026-03-26T12:01:00.000Z",
      invoiceFailedAt: null,
      invoiceError: null,
      invoiceIdempotencyKey: "invoice-key",
    })
    buildBucketObjectUrlForKeyMock.mockReturnValue("https://storage.example.com/builders/invoices/wo-1/invoice.pdf")

    const response = await GET_INVOICE_DOWNLOAD(new Request("http://localhost/api/flooring/work-orders/wo-1/invoice/download"), {
      params: Promise.resolve({ id: "wo-1" }),
    })

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe("https://storage.example.com/builders/invoices/wo-1/invoice.pdf")
  })
})
