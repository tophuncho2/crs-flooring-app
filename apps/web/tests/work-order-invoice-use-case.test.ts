import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getWorkOrderInvoiceStatusMock,
  queueWorkOrderInvoiceGenerationMock,
  failWorkOrderInvoiceGenerationMock,
  enqueueWorkOrderInvoiceJobMock,
} = vi.hoisted(() => ({
  getWorkOrderInvoiceStatusMock: vi.fn(),
  queueWorkOrderInvoiceGenerationMock: vi.fn(),
  failWorkOrderInvoiceGenerationMock: vi.fn(),
  enqueueWorkOrderInvoiceJobMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  getWorkOrderInvoiceStatus: getWorkOrderInvoiceStatusMock,
  queueWorkOrderInvoiceGeneration: queueWorkOrderInvoiceGenerationMock,
  failWorkOrderInvoiceGeneration: failWorkOrderInvoiceGenerationMock,
}))

vi.mock("@/server/queues/invoice-queue", () => ({
  enqueueWorkOrderInvoiceJob: enqueueWorkOrderInvoiceJobMock,
}))

import { queueWorkOrderInvoiceUseCase } from "@/features/flooring/work-orders/application/invoice"

describe("queueWorkOrderInvoiceUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the existing ready invoice state when the idempotency key matches", async () => {
    getWorkOrderInvoiceStatusMock.mockResolvedValue({
      workOrderId: "wo-1",
      invoiceSourceUpdatedAt: "2026-03-26T12:00:00.000Z",
      invoiceStatus: "READY",
      invoiceFileKey: "invoices/wo-1/invoice.pdf",
      invoiceRequestedAt: "2026-03-26T12:00:00.000Z",
      invoiceGeneratedAt: "2026-03-26T12:01:00.000Z",
      invoiceFailedAt: null,
      invoiceError: null,
      invoiceIdempotencyKey: "invoice:v1:wo-1:2026-03-26T12:00:00.000Z",
    })

    const result = await queueWorkOrderInvoiceUseCase("wo-1", "user-1")

    expect(result.invoiceStatus).toBe("READY")
    expect(queueWorkOrderInvoiceGenerationMock).not.toHaveBeenCalled()
    expect(enqueueWorkOrderInvoiceJobMock).not.toHaveBeenCalled()
  })

  it("queues a new invoice job when the current state is idle", async () => {
    getWorkOrderInvoiceStatusMock.mockResolvedValue({
      workOrderId: "wo-1",
      invoiceSourceUpdatedAt: "2026-03-26T12:00:00.000Z",
      invoiceStatus: "IDLE",
      invoiceFileKey: null,
      invoiceRequestedAt: null,
      invoiceGeneratedAt: null,
      invoiceFailedAt: null,
      invoiceError: null,
      invoiceIdempotencyKey: null,
    })
    queueWorkOrderInvoiceGenerationMock.mockResolvedValue({
      workOrderId: "wo-1",
      invoiceSourceUpdatedAt: "2026-03-26T12:00:00.000Z",
      invoiceStatus: "QUEUED",
      invoiceFileKey: null,
      invoiceRequestedAt: "2026-03-26T12:01:00.000Z",
      invoiceGeneratedAt: null,
      invoiceFailedAt: null,
      invoiceError: null,
      invoiceIdempotencyKey: "invoice:v1:wo-1:2026-03-26T12:00:00.000Z",
    })

    const result = await queueWorkOrderInvoiceUseCase("wo-1", "user-1")

    expect(queueWorkOrderInvoiceGenerationMock).toHaveBeenCalledWith("wo-1", {
      idempotencyKey: "invoice:v1:wo-1:2026-03-26T12:00:00.000Z",
    })
    expect(enqueueWorkOrderInvoiceJobMock).toHaveBeenCalledWith(expect.objectContaining({
      workOrderId: "wo-1",
      triggeredByUserId: "user-1",
      idempotencyKey: "invoice:v1:wo-1:2026-03-26T12:00:00.000Z",
    }))
    expect(result.invoiceStatus).toBe("QUEUED")
  })

  it("marks the invoice as failed if queue enqueueing throws", async () => {
    getWorkOrderInvoiceStatusMock.mockResolvedValue({
      workOrderId: "wo-1",
      invoiceSourceUpdatedAt: "2026-03-26T12:00:00.000Z",
      invoiceStatus: "IDLE",
      invoiceFileKey: null,
      invoiceRequestedAt: null,
      invoiceGeneratedAt: null,
      invoiceFailedAt: null,
      invoiceError: null,
      invoiceIdempotencyKey: null,
    })
    queueWorkOrderInvoiceGenerationMock.mockResolvedValue({
      workOrderId: "wo-1",
      invoiceSourceUpdatedAt: "2026-03-26T12:00:00.000Z",
      invoiceStatus: "QUEUED",
      invoiceFileKey: null,
      invoiceRequestedAt: "2026-03-26T12:01:00.000Z",
      invoiceGeneratedAt: null,
      invoiceFailedAt: null,
      invoiceError: null,
      invoiceIdempotencyKey: "invoice:v1:wo-1:2026-03-26T12:00:00.000Z",
    })
    enqueueWorkOrderInvoiceJobMock.mockRejectedValue(new Error("Redis unavailable"))

    await expect(queueWorkOrderInvoiceUseCase("wo-1", "user-1")).rejects.toThrow("Redis unavailable")

    expect(failWorkOrderInvoiceGenerationMock).toHaveBeenCalledWith("wo-1", {
      idempotencyKey: "invoice:v1:wo-1:2026-03-26T12:00:00.000Z",
      errorMessage: "Redis unavailable",
    })
  })
})
