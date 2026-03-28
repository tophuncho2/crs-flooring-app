import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET as GET_INVOICE, POST as POST_INVOICE } from "@/app/api/flooring/work-orders/[id]/invoice/route"
import { GET as GET_INVOICE_DOWNLOAD } from "@/app/api/flooring/work-orders/[id]/invoice/download/route"

const WORK_ORDER_ID = "11111111-1111-4111-8111-111111111111"

const {
  authorizeWorkOrdersRouteMock,
  requireRouteAccessMock,
  enforceRouteRateLimitMock,
  queueWorkOrderInvoiceUseCaseMock,
  getWorkOrderInvoiceStatusUseCaseMock,
  withMutationTelemetryMock,
  createPresignedBucketObjectUrlForKeyMock,
  getWorkOrderByIdMock,
  getAppMutationReceiptMock,
  reserveAppMutationReceiptMock,
  finalizeAppMutationReceiptMock,
} = vi.hoisted(() => ({
  authorizeWorkOrdersRouteMock: vi.fn(),
  requireRouteAccessMock: vi.fn(),
  enforceRouteRateLimitMock: vi.fn(),
  queueWorkOrderInvoiceUseCaseMock: vi.fn(),
  getWorkOrderInvoiceStatusUseCaseMock: vi.fn(),
  withMutationTelemetryMock: vi.fn(),
  createPresignedBucketObjectUrlForKeyMock: vi.fn(),
  getWorkOrderByIdMock: vi.fn(),
  getAppMutationReceiptMock: vi.fn(),
  reserveAppMutationReceiptMock: vi.fn(),
  finalizeAppMutationReceiptMock: vi.fn(),
}))

vi.mock("@builders/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@builders/db")>()
  return {
    ...actual,
    getAppMutationReceipt: getAppMutationReceiptMock,
    reserveAppMutationReceipt: reserveAppMutationReceiptMock,
    finalizeAppMutationReceipt: finalizeAppMutationReceiptMock,
  }
})

vi.mock("@/features/flooring/shared/access/templates-work-orders", () => ({
  authorizeWorkOrdersRoute: authorizeWorkOrdersRouteMock,
}))

vi.mock("@/features/flooring/work-orders/transport/detail", () => ({
  withWorkOrderCapabilities: (workOrder: Record<string, unknown>) => ({
    ...workOrder,
    capabilities: {
      canWrite: true,
      canDelete: true,
      canAllocate: true,
      canSyncTemplate: true,
      canGenerateInvoice: true,
    },
  }),
}))

vi.mock("@/server/http/route-helpers", () => ({
  requireRouteAccess: requireRouteAccessMock,
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

vi.mock("@/features/flooring/work-orders/queries", () => ({
  getWorkOrderById: getWorkOrderByIdMock,
}))

vi.mock("@/server/storage/s3", () => ({
  createPresignedBucketObjectUrlForKey: createPresignedBucketObjectUrlForKeyMock,
}))

describe("work-order invoice routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeWorkOrdersRouteMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: { id: "user-1", email: "owner@test.com", role: "OWNER" },
    })
    requireRouteAccessMock.mockResolvedValue({
      requestId: "req-1",
      clientIp: "127.0.0.1",
      user: { id: "user-1", email: "owner@test.com", role: "OWNER" },
    })
    enforceRouteRateLimitMock.mockResolvedValue(null)
    getAppMutationReceiptMock.mockResolvedValue(null)
    reserveAppMutationReceiptMock.mockResolvedValue(undefined)
    finalizeAppMutationReceiptMock.mockResolvedValue(undefined)
    getWorkOrderByIdMock.mockResolvedValue({
      id: WORK_ORDER_ID,
      workOrderNumber: "WO-00001",
      updatedAt: "2026-03-26T12:00:00.000Z",
      items: [],
      serviceItems: [],
      salesReps: [],
      summary: {},
      financialSummary: {},
    })
    withMutationTelemetryMock.mockImplementation(async (_access, _event, operation) => operation())
  })

  it("returns the current invoice generation and artifact status", async () => {
    getWorkOrderInvoiceStatusUseCaseMock.mockResolvedValue({
      workOrderId: WORK_ORDER_ID,
      sourceVersion: "2026-03-26T12:00:00.000Z",
      generation: {
        id: "gen-1",
        workOrderId: "wo-1",
        requestedByUserId: "user-1",
        sourceVersion: "2026-03-26T12:00:00.000Z",
        idempotencyKey: "invoice-key",
        status: "COMPLETED",
        requestId: "req-1",
        queueJobId: "invoice-key",
        requestedAt: "2026-03-26T12:00:00.000Z",
        queuedAt: "2026-03-26T12:00:01.000Z",
        startedAt: "2026-03-26T12:00:02.000Z",
        completedAt: "2026-03-26T12:01:00.000Z",
        failedAt: null,
        supersededAt: null,
        failureCode: null,
        failureMessage: null,
      },
      artifact: {
        id: "artifact-1",
        generationId: "gen-1",
        workOrderId: "wo-1",
        bucketName: "builders",
        storageKey: "invoices/wo-1/invoice.pdf",
        fileName: "WO-00001.pdf",
        contentType: "application/pdf",
        checksum: "abc",
        sizeBytes: 123,
        createdAt: "2026-03-26T12:01:00.000Z",
        deletedAt: null,
      },
    })

    const response = await GET_INVOICE(new Request(`http://localhost/api/flooring/work-orders/${WORK_ORDER_ID}/invoice`), {
      params: Promise.resolve({ id: WORK_ORDER_ID }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      sourceVersion: "2026-03-26T12:00:00.000Z",
      generation: {
        id: "gen-1",
        status: "COMPLETED",
        requestedAt: "2026-03-26T12:00:00.000Z",
        queuedAt: "2026-03-26T12:00:01.000Z",
        startedAt: "2026-03-26T12:00:02.000Z",
        completedAt: "2026-03-26T12:01:00.000Z",
        failedAt: null,
        error: "",
      },
      artifact: {
        id: "artifact-1",
        fileName: "WO-00001.pdf",
        createdAt: "2026-03-26T12:01:00.000Z",
        downloadUrl: `/api/flooring/work-orders/${WORK_ORDER_ID}/invoice/download`,
      },
      canOpen: true,
    })
  })

  it("requests invoice generation through the use case", async () => {
    queueWorkOrderInvoiceUseCaseMock.mockResolvedValue({
      workOrderId: WORK_ORDER_ID,
      sourceVersion: "2026-03-26T12:00:00.000Z",
      generation: {
        id: "gen-1",
        workOrderId: "wo-1",
        requestedByUserId: "user-1",
        sourceVersion: "2026-03-26T12:00:00.000Z",
        idempotencyKey: "invoice-key",
        status: "REQUESTED",
        requestId: "req-1",
        queueJobId: null,
        requestedAt: "2026-03-26T12:00:00.000Z",
        queuedAt: null,
        startedAt: null,
        completedAt: null,
        failedAt: null,
        supersededAt: null,
        failureCode: null,
        failureMessage: null,
      },
      artifact: null,
    })

    const response = await POST_INVOICE(new Request(`http://localhost/api/flooring/work-orders/${WORK_ORDER_ID}/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mutation: {
          idempotencyKey: "invoice-request-1",
          expectedUpdatedAt: "2026-03-26T12:00:00.000Z",
        },
      }),
    }), {
      params: Promise.resolve({ id: WORK_ORDER_ID }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(queueWorkOrderInvoiceUseCaseMock).toHaveBeenCalledWith({
      workOrderId: WORK_ORDER_ID,
      triggeredByUserId: "user-1",
      requestId: "req-1",
    })
    expect(payload.generation.status).toBe("REQUESTED")
    expect(payload.canOpen).toBe(false)
  })

  it("returns 409 when no invoice artifact exists yet", async () => {
    getWorkOrderInvoiceStatusUseCaseMock.mockResolvedValue({
      workOrderId: WORK_ORDER_ID,
      sourceVersion: "2026-03-26T12:00:00.000Z",
      generation: {
        id: "gen-1",
        workOrderId: "wo-1",
        requestedByUserId: "user-1",
        sourceVersion: "2026-03-26T12:00:00.000Z",
        idempotencyKey: "invoice-key",
        status: "PROCESSING",
        requestId: "req-1",
        queueJobId: "invoice-key",
        requestedAt: "2026-03-26T12:00:00.000Z",
        queuedAt: "2026-03-26T12:00:01.000Z",
        startedAt: "2026-03-26T12:00:02.000Z",
        completedAt: null,
        failedAt: null,
        supersededAt: null,
        failureCode: null,
        failureMessage: null,
      },
      artifact: null,
    })

    const response = await GET_INVOICE_DOWNLOAD(new Request(`http://localhost/api/flooring/work-orders/${WORK_ORDER_ID}/invoice/download`), {
      params: Promise.resolve({ id: WORK_ORDER_ID }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("Invoice is not ready yet")
  })

  it("redirects to a presigned invoice url when an artifact exists", async () => {
    getWorkOrderInvoiceStatusUseCaseMock.mockResolvedValue({
      workOrderId: WORK_ORDER_ID,
      sourceVersion: "2026-03-26T12:00:00.000Z",
      generation: null,
      artifact: {
        id: "artifact-1",
        generationId: "gen-1",
        workOrderId: WORK_ORDER_ID,
        bucketName: "builders",
        storageKey: `invoices/${WORK_ORDER_ID}/invoice.pdf`,
        fileName: "WO-00001.pdf",
        contentType: "application/pdf",
        checksum: "abc",
        sizeBytes: 123,
        createdAt: "2026-03-26T12:01:00.000Z",
        deletedAt: null,
      },
    })
    createPresignedBucketObjectUrlForKeyMock.mockResolvedValue("https://storage.example.com/presigned")

    const response = await GET_INVOICE_DOWNLOAD(new Request(`http://localhost/api/flooring/work-orders/${WORK_ORDER_ID}/invoice/download`), {
      params: Promise.resolve({ id: WORK_ORDER_ID }),
    })

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe("https://storage.example.com/presigned")
  })
})
