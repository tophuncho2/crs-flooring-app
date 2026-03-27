import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getWorkOrderInvoiceViewMock,
  createInvoiceGenerationMock,
  supersedePendingInvoiceGenerationsMock,
  createQueueOutboxEventMock,
  withDatabaseTransactionMock,
} = vi.hoisted(() => ({
  getWorkOrderInvoiceViewMock: vi.fn(),
  createInvoiceGenerationMock: vi.fn(),
  supersedePendingInvoiceGenerationsMock: vi.fn(),
  createQueueOutboxEventMock: vi.fn(),
  withDatabaseTransactionMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  getWorkOrderInvoiceView: getWorkOrderInvoiceViewMock,
  createInvoiceGeneration: createInvoiceGenerationMock,
  supersedePendingInvoiceGenerations: supersedePendingInvoiceGenerationsMock,
  createQueueOutboxEvent: createQueueOutboxEventMock,
  withDatabaseTransaction: withDatabaseTransactionMock,
}))

import { queueWorkOrderInvoiceUseCase } from "@/features/flooring/work-orders/application/invoice"

describe("queueWorkOrderInvoiceUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withDatabaseTransactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({}))
  })

  it("returns the existing generation for the current invoice source version", async () => {
    getWorkOrderInvoiceViewMock.mockResolvedValue({
      workOrderId: "wo-1",
      sourceVersion: "2026-03-26T12:00:00.000Z",
      generation: {
        id: "gen-1",
        workOrderId: "wo-1",
        requestedByUserId: "user-1",
        sourceVersion: "2026-03-26T12:00:00.000Z",
        idempotencyKey: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
        status: "COMPLETED",
        requestId: "req-1",
        queueJobId: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
        requestedAt: "2026-03-26T12:01:00.000Z",
        queuedAt: "2026-03-26T12:01:01.000Z",
        startedAt: "2026-03-26T12:01:02.000Z",
        completedAt: "2026-03-26T12:01:10.000Z",
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
        createdAt: "2026-03-26T12:01:10.000Z",
        deletedAt: null,
      },
    })

    const result = await queueWorkOrderInvoiceUseCase({
      workOrderId: "wo-1",
      triggeredByUserId: "user-1",
      requestId: "req-1",
    })

    expect(result.generation?.status).toBe("COMPLETED")
    expect(createInvoiceGenerationMock).not.toHaveBeenCalled()
    expect(createQueueOutboxEventMock).not.toHaveBeenCalled()
  })

  it("creates a generation and outbox event when the current source has no generation", async () => {
    getWorkOrderInvoiceViewMock.mockResolvedValue({
      workOrderId: "wo-1",
      sourceVersion: "2026-03-26T12:00:00.000Z",
      generation: null,
      artifact: null,
    })
    createInvoiceGenerationMock.mockResolvedValue({
      id: "gen-1",
      workOrderId: "wo-1",
      requestedByUserId: "user-1",
      sourceVersion: "2026-03-26T12:00:00.000Z",
      idempotencyKey: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
      status: "REQUESTED",
      requestId: "req-1",
      queueJobId: null,
      requestedAt: "2026-03-26T12:01:00.000Z",
      queuedAt: null,
      startedAt: null,
      completedAt: null,
      failedAt: null,
      supersededAt: null,
      failureCode: null,
      failureMessage: null,
    })

    const result = await queueWorkOrderInvoiceUseCase({
      workOrderId: "wo-1",
      triggeredByUserId: "user-1",
      requestId: "req-1",
    })

    expect(supersedePendingInvoiceGenerationsMock).toHaveBeenCalled()
    expect(createInvoiceGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workOrderId: "wo-1",
        requestedByUserId: "user-1",
        idempotencyKey: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
        requestId: "req-1",
      }),
      {},
    )
    expect(createQueueOutboxEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "invoice.generation.requested.v1",
        aggregateId: "gen-1",
        idempotencyKey: "invoice:v2:wo-1:2026-03-26T12:00:00.000Z",
      }),
      {},
    )
    expect(result.generation?.status).toBe("REQUESTED")
  })
})
