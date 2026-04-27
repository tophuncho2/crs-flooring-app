import { CutLogExecutionError } from "@builders/application"
import type { FinalizeCutLogBatchPayload } from "@builders/domain"
import { UnrecoverableError } from "bullmq"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createFinalizeCutLogBatchHandler } from "../src/processors/finalize-cut-log-batch.js"

const samplePayload: FinalizeCutLogBatchPayload = {
  version: "v1",
  topic: "flooring.cut-log.finalize",
  inventoryId: "11111111-1111-4111-8111-111111111111",
  cutLogIds: [
    "55555555-5555-4555-8555-555555555555",
    "66666666-6666-4666-8666-666666666666",
  ],
  requestedBy: {
    userId: "33333333-3333-4333-8333-333333333333",
    userEmail: "user@example.com",
  },
  requestedAt: "2026-04-26T00:00:00.000Z",
}

describe("createFinalizeCutLogBatchHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("parses the payload, calls the use case, and returns the result", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const finalizeCutLogs = vi.fn().mockResolvedValue({
      finalizedRowIds: samplePayload.cutLogIds,
      finalCutSequenceByRowId: {
        [samplePayload.cutLogIds[0]]: 1,
        [samplePayload.cutLogIds[1]]: 2,
      },
    })

    const handler = createFinalizeCutLogBatchHandler({
      parsePayload,
      finalizeCutLogs,
    })

    const result = await handler({ data: samplePayload })

    expect(parsePayload).toHaveBeenCalledWith(samplePayload)
    expect(finalizeCutLogs).toHaveBeenCalledWith(samplePayload)
    expect(result).toEqual({
      finalizedRowIds: samplePayload.cutLogIds,
      finalCutSequenceByRowId: {
        [samplePayload.cutLogIds[0]]: 1,
        [samplePayload.cutLogIds[1]]: 2,
      },
    })
  })

  it("wraps CutLogExecutionError as UnrecoverableError", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const finalizeCutLogs = vi.fn().mockRejectedValue(
      new CutLogExecutionError({
        code: "CUT_LOG_PRECONDITION_FAILED",
        message: "Cut logs drifted before finalize ran",
        status: 409,
      }),
    )

    const handler = createFinalizeCutLogBatchHandler({
      parsePayload,
      finalizeCutLogs,
    })

    await expect(handler({ data: samplePayload })).rejects.toBeInstanceOf(UnrecoverableError)
  })

  it("propagates non-domain errors so BullMQ can retry", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const transportError = new Error("postgres connection refused")
    const finalizeCutLogs = vi.fn().mockRejectedValue(transportError)

    const handler = createFinalizeCutLogBatchHandler({
      parsePayload,
      finalizeCutLogs,
    })

    await expect(handler({ data: samplePayload })).rejects.toBe(transportError)
  })
})
