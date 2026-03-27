import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock } = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  withDatabaseTransaction: withDatabaseTransactionMock,
}))

import { createWorkOrderAllocationOutboxDispatcher } from "../src/dispatch/work-order-allocation-outbox-dispatcher.js"

describe("createWorkOrderAllocationOutboxDispatcher", () => {
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

  it("claims an auto-allocation outbox event and publishes the job", async () => {
    const dispatcher = createWorkOrderAllocationOutboxDispatcher({
      listClaimableEvents: vi.fn().mockResolvedValue([
        {
          id: "event-1",
          topic: "work-order.allocation.requested.v1",
          aggregateType: "flooringWorkOrderAllocationRun",
          aggregateId: "11111111-1111-4111-8111-111111111111",
          idempotencyKey: "work-order-allocation:v1:11111111-1111-4111-8111-111111111111",
          payloadJson: {
            version: "v1",
            topic: "work-order.allocation.requested.v1",
            requestId: "req-1",
            allocationRunId: "11111111-1111-4111-8111-111111111111",
            workOrderId: "22222222-2222-4222-8222-222222222222",
            requestedByUserId: "33333333-3333-4333-8333-333333333333",
            idempotencyKey: "work-order-allocation:v1:11111111-1111-4111-8111-111111111111",
            sourceVersion: "2026-03-27T00:00:00.000Z",
            requestedAt: "2026-03-27T00:00:00.000Z",
          },
          status: "PENDING",
          availableAt: "2026-03-27T00:00:00.000Z",
          lockedAt: null,
          lockedBy: null,
          dispatchedAt: null,
          attemptCount: 0,
          lastError: null,
          createdAt: "2026-03-27T00:00:00.000Z",
          updatedAt: "2026-03-27T00:00:00.000Z",
        },
      ]),
      claimEvent: vi.fn().mockResolvedValue({
        id: "event-1",
        topic: "work-order.allocation.requested.v1",
        aggregateType: "flooringWorkOrderAllocationRun",
        aggregateId: "11111111-1111-4111-8111-111111111111",
        idempotencyKey: "work-order-allocation:v1:11111111-1111-4111-8111-111111111111",
        payloadJson: {
          version: "v1",
          topic: "work-order.allocation.requested.v1",
          requestId: "req-1",
          allocationRunId: "11111111-1111-4111-8111-111111111111",
          workOrderId: "22222222-2222-4222-8222-222222222222",
          requestedByUserId: "33333333-3333-4333-8333-333333333333",
          idempotencyKey: "work-order-allocation:v1:11111111-1111-4111-8111-111111111111",
          sourceVersion: "2026-03-27T00:00:00.000Z",
          requestedAt: "2026-03-27T00:00:00.000Z",
        },
        status: "PROCESSING",
        availableAt: "2026-03-27T00:00:00.000Z",
        lockedAt: "2026-03-27T00:00:10.000Z",
        lockedBy: "builders-relay",
        dispatchedAt: null,
        attemptCount: 1,
        lastError: null,
        createdAt: "2026-03-27T00:00:00.000Z",
        updatedAt: "2026-03-27T00:00:10.000Z",
      }),
      markEventDispatched: vi.fn().mockResolvedValue(undefined),
      retryEvent: vi.fn(),
      exhaustEvent: vi.fn(),
      queueRun: vi.fn().mockResolvedValue(true),
      failRun: vi.fn(),
    })

    const queue = {
      add: vi.fn().mockResolvedValue({ id: "work-order-allocation:v1:11111111-1111-4111-8111-111111111111" }),
    }

    const result = await dispatcher.dispatchBatch(env, queue as never)

    expect(result).toEqual({
      scannedCount: 1,
      dispatchedCount: 1,
    })
    expect(queue.add).toHaveBeenCalledWith(
      "auto-allocate-work-order",
      expect.objectContaining({
        allocationRunId: "11111111-1111-4111-8111-111111111111",
        workOrderId: "22222222-2222-4222-8222-222222222222",
      }),
      expect.objectContaining({
        jobId: "work-order-allocation:v1:11111111-1111-4111-8111-111111111111",
      }),
    )
  })
})
