import { beforeEach, describe, expect, it, vi } from "vitest"

const { processWorkOrderAutoAllocationRunUseCaseMock } = vi.hoisted(() => ({
  processWorkOrderAutoAllocationRunUseCaseMock: vi.fn(),
}))

vi.mock("@builders/execution", () => ({
  processWorkOrderAutoAllocationRunUseCase: processWorkOrderAutoAllocationRunUseCaseMock,
}))

import { createWorkOrderAutoAllocationProcessor } from "../src/processors/process-work-order-auto-allocation.js"

describe("createWorkOrderAutoAllocationProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("delegates worker jobs to the shared execution use case", async () => {
    processWorkOrderAutoAllocationRunUseCaseMock.mockResolvedValue({
      status: "completed",
      allocatedRowCount: 2,
      shortageCount: 0,
    })

    const processor = createWorkOrderAutoAllocationProcessor()
    const job = {
      version: "v1",
      jobName: "auto-allocate-work-order",
      requestId: "req-1",
      allocationRunId: "run-1",
      workOrderId: "wo-1",
      requestedByUserId: "user-1",
      idempotencyKey: "key-1",
      sourceVersion: "2026-03-30T00:00:00.000Z",
      queuedAt: "2026-03-30T00:00:01.000Z",
    }

    const result = await processor(job, {} as never, {
      attemptNumber: 1,
      maxAttempts: 3,
    })

    expect(result).toEqual({
      status: "completed",
      allocatedRowCount: 2,
      shortageCount: 0,
    })
    expect(processWorkOrderAutoAllocationRunUseCaseMock).toHaveBeenCalledWith(job, {
      attemptNumber: 1,
      maxAttempts: 3,
    })
  })
})
