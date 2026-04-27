import { CutLogExecutionError } from "@builders/application"
import type { PendingSaveCutLogBatchPayload } from "@builders/domain"
import { UnrecoverableError } from "bullmq"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPendingSaveCutLogBatchHandler } from "../src/processors/pending-save-cut-log-batch.js"

const samplePayload: PendingSaveCutLogBatchPayload = {
  version: "v1",
  topic: "flooring.cut-log.pending-save",
  inventoryId: "11111111-1111-4111-8111-111111111111",
  diff: {
    added: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        tempId: "draft-1",
        cut: "12.50",
        cost: "100.00",
        freight: "10.00",
        isWaste: false,
        notes: "first cut",
      },
    ],
    modified: [],
    deleted: [],
  },
  requestedBy: {
    userId: "33333333-3333-4333-8333-333333333333",
    userEmail: "user@example.com",
  },
  requestedAt: "2026-04-26T00:00:00.000Z",
}

describe("createPendingSaveCutLogBatchHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("parses the payload, calls the use case, and returns the result", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const applyCutLogPendingDiff = vi.fn().mockResolvedValue({
      rows: [],
      newTotalCutSum: "12.50",
    })

    const handler = createPendingSaveCutLogBatchHandler({
      parsePayload,
      applyCutLogPendingDiff,
    })

    const result = await handler({ data: samplePayload })

    expect(parsePayload).toHaveBeenCalledWith(samplePayload)
    expect(applyCutLogPendingDiff).toHaveBeenCalledWith(samplePayload)
    expect(result).toEqual({
      rows: [],
      newTotalCutSum: "12.50",
    })
  })

  it("wraps CutLogExecutionError as UnrecoverableError", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const applyCutLogPendingDiff = vi.fn().mockRejectedValue(
      new CutLogExecutionError({
        code: "CUT_LOG_DIFF_VALIDATION_FAILED",
        message: "Diff drifted under the lock",
        status: 409,
      }),
    )

    const handler = createPendingSaveCutLogBatchHandler({
      parsePayload,
      applyCutLogPendingDiff,
    })

    await expect(handler({ data: samplePayload })).rejects.toBeInstanceOf(UnrecoverableError)
  })

  it("propagates non-domain errors so BullMQ can retry", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const transportError = new Error("postgres connection refused")
    const applyCutLogPendingDiff = vi.fn().mockRejectedValue(transportError)

    const handler = createPendingSaveCutLogBatchHandler({
      parsePayload,
      applyCutLogPendingDiff,
    })

    await expect(handler({ data: samplePayload })).rejects.toBe(transportError)
  })
})
