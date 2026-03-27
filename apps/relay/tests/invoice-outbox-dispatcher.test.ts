import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock } = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  withDatabaseTransaction: withDatabaseTransactionMock,
}))

import { createInvoiceOutboxDispatcher } from "../src/dispatch/invoice-outbox-dispatcher.js"

describe("createInvoiceOutboxDispatcher", () => {
  const env = {
    queueRedisUrl: "redis://localhost:6379",
    batchSize: 20,
    pollIntervalMs: 2000,
    claimTtlMs: 30000,
    maxAttempts: 5,
    environmentName: "test",
    serviceName: "builders-relay",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    withDatabaseTransactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({}))
  })

  it("claims an outbox event, publishes the invoice job, and marks it dispatched", async () => {
    const dispatcher = createInvoiceOutboxDispatcher({
      listClaimableEvents: vi.fn().mockResolvedValue([
        {
          id: "event-1",
          topic: "invoice.generation.requested.v1",
          aggregateType: "flooringInvoiceGeneration",
          aggregateId: "11111111-1111-4111-8111-111111111111",
          idempotencyKey: "invoice:v2:22222222-2222-4222-8222-222222222222:2026-03-26T12:00:00.000Z",
          payloadJson: {
            version: "v1",
            topic: "invoice.generation.requested.v1",
            requestId: "req-1",
            generationId: "11111111-1111-4111-8111-111111111111",
            workOrderId: "22222222-2222-4222-8222-222222222222",
            requestedByUserId: "33333333-3333-4333-8333-333333333333",
            idempotencyKey: "invoice:v2:22222222-2222-4222-8222-222222222222:2026-03-26T12:00:00.000Z",
            sourceVersion: "2026-03-26T12:00:00.000Z",
            requestedAt: "2026-03-26T12:00:00.000Z",
          },
          status: "PENDING",
          availableAt: "2026-03-26T12:00:00.000Z",
          lockedAt: null,
          lockedBy: null,
          dispatchedAt: null,
          attemptCount: 0,
          lastError: null,
          createdAt: "2026-03-26T12:00:00.000Z",
          updatedAt: "2026-03-26T12:00:00.000Z",
        },
      ]),
      claimEvent: vi.fn().mockResolvedValue({
        id: "event-1",
        topic: "invoice.generation.requested.v1",
        aggregateType: "flooringInvoiceGeneration",
        aggregateId: "11111111-1111-4111-8111-111111111111",
        idempotencyKey: "invoice:v2:22222222-2222-4222-8222-222222222222:2026-03-26T12:00:00.000Z",
        payloadJson: {
          version: "v1",
          topic: "invoice.generation.requested.v1",
          requestId: "req-1",
          generationId: "11111111-1111-4111-8111-111111111111",
          workOrderId: "22222222-2222-4222-8222-222222222222",
          requestedByUserId: "33333333-3333-4333-8333-333333333333",
          idempotencyKey: "invoice:v2:22222222-2222-4222-8222-222222222222:2026-03-26T12:00:00.000Z",
          sourceVersion: "2026-03-26T12:00:00.000Z",
          requestedAt: "2026-03-26T12:00:00.000Z",
        },
        status: "PROCESSING",
        availableAt: "2026-03-26T12:00:00.000Z",
        lockedAt: "2026-03-26T12:00:10.000Z",
        lockedBy: "builders-relay",
        dispatchedAt: null,
        attemptCount: 1,
        lastError: null,
        createdAt: "2026-03-26T12:00:00.000Z",
        updatedAt: "2026-03-26T12:00:10.000Z",
      }),
      markEventDispatched: vi.fn().mockResolvedValue(undefined),
      retryEvent: vi.fn(),
      exhaustEvent: vi.fn(),
      queueGeneration: vi.fn().mockResolvedValue(true),
      failGeneration: vi.fn(),
    })

    const queue = {
      add: vi.fn().mockResolvedValue({ id: "invoice:v2:22222222-2222-4222-8222-222222222222:2026-03-26T12:00:00.000Z" }),
    }

    const result = await dispatcher.dispatchBatch(env, queue as never)

    expect(result).toEqual({
      scannedCount: 1,
      dispatchedCount: 1,
    })
    expect(queue.add).toHaveBeenCalledWith(
      "generate-work-order-invoice",
      expect.objectContaining({
        generationId: "11111111-1111-4111-8111-111111111111",
        workOrderId: "22222222-2222-4222-8222-222222222222",
      }),
      expect.objectContaining({
        jobId: "invoice:v2:22222222-2222-4222-8222-222222222222:2026-03-26T12:00:00.000Z",
      }),
    )
  })

  it("schedules a retry when queue publication fails", async () => {
    const retryEvent = vi.fn().mockResolvedValue(undefined)
    const dispatcher = createInvoiceOutboxDispatcher({
      listClaimableEvents: vi.fn().mockResolvedValue([
        {
          id: "event-1",
          topic: "invoice.generation.requested.v1",
          aggregateType: "flooringInvoiceGeneration",
          aggregateId: "11111111-1111-4111-8111-111111111111",
          idempotencyKey: "invoice:v2:22222222-2222-4222-8222-222222222222:2026-03-26T12:00:00.000Z",
          payloadJson: {
            version: "v1",
            topic: "invoice.generation.requested.v1",
            requestId: "req-1",
            generationId: "11111111-1111-4111-8111-111111111111",
            workOrderId: "22222222-2222-4222-8222-222222222222",
            requestedByUserId: "33333333-3333-4333-8333-333333333333",
            idempotencyKey: "invoice:v2:22222222-2222-4222-8222-222222222222:2026-03-26T12:00:00.000Z",
            sourceVersion: "2026-03-26T12:00:00.000Z",
            requestedAt: "2026-03-26T12:00:00.000Z",
          },
          status: "PENDING",
          availableAt: "2026-03-26T12:00:00.000Z",
          lockedAt: null,
          lockedBy: null,
          dispatchedAt: null,
          attemptCount: 0,
          lastError: null,
          createdAt: "2026-03-26T12:00:00.000Z",
          updatedAt: "2026-03-26T12:00:00.000Z",
        },
      ]),
      claimEvent: vi.fn().mockResolvedValue({
        id: "event-1",
        topic: "invoice.generation.requested.v1",
        aggregateType: "flooringInvoiceGeneration",
        aggregateId: "11111111-1111-4111-8111-111111111111",
        idempotencyKey: "invoice:v2:22222222-2222-4222-8222-222222222222:2026-03-26T12:00:00.000Z",
        payloadJson: {
          version: "v1",
          topic: "invoice.generation.requested.v1",
          requestId: "req-1",
          generationId: "11111111-1111-4111-8111-111111111111",
          workOrderId: "22222222-2222-4222-8222-222222222222",
          requestedByUserId: "33333333-3333-4333-8333-333333333333",
          idempotencyKey: "invoice:v2:22222222-2222-4222-8222-222222222222:2026-03-26T12:00:00.000Z",
          sourceVersion: "2026-03-26T12:00:00.000Z",
          requestedAt: "2026-03-26T12:00:00.000Z",
        },
        status: "PROCESSING",
        availableAt: "2026-03-26T12:00:00.000Z",
        lockedAt: "2026-03-26T12:00:10.000Z",
        lockedBy: "builders-relay",
        dispatchedAt: null,
        attemptCount: 1,
        lastError: null,
        createdAt: "2026-03-26T12:00:00.000Z",
        updatedAt: "2026-03-26T12:00:10.000Z",
      }),
      markEventDispatched: vi.fn(),
      retryEvent,
      exhaustEvent: vi.fn(),
      queueGeneration: vi.fn(),
      failGeneration: vi.fn(),
    })

    const queue = {
      add: vi.fn().mockRejectedValue(new Error("Redis unavailable")),
    }

    const result = await dispatcher.dispatchBatch(env, queue as never)

    expect(result).toEqual({
      scannedCount: 1,
      dispatchedCount: 0,
    })
    expect(retryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "event-1",
        lastError: "Redis unavailable",
      }),
    )
  })
})
