import { CutLogExecutionError } from "@builders/application"
import type { VoidCutLogPayload } from "@builders/domain"
import { UnrecoverableError } from "bullmq"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createVoidCutLogHandler } from "../src/processors/void-cut-log.js"

const samplePayload: VoidCutLogPayload = {
  version: "v1",
  topic: "flooring.cut-log.void",
  inventoryId: "11111111-1111-4111-8111-111111111111",
  cutLogId: "55555555-5555-4555-8555-555555555555",
  requestedBy: {
    userId: "33333333-3333-4333-8333-333333333333",
    userEmail: "user@example.com",
  },
  requestedAt: "2026-04-26T00:00:00.000Z",
}

describe("createVoidCutLogHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("parses the payload, calls the use case, and returns the result", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const voidCutLog = vi.fn().mockResolvedValue({
      row: { id: samplePayload.cutLogId },
      newTotalCutSum: "0.00",
    })

    const handler = createVoidCutLogHandler({
      parsePayload,
      voidCutLog,
    })

    const result = await handler({ data: samplePayload })

    expect(parsePayload).toHaveBeenCalledWith(samplePayload)
    expect(voidCutLog).toHaveBeenCalledWith(samplePayload)
    expect(result).toEqual({
      row: { id: samplePayload.cutLogId },
      newTotalCutSum: "0.00",
    })
  })

  it("wraps CutLogExecutionError as UnrecoverableError", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const voidCutLog = vi.fn().mockRejectedValue(
      new CutLogExecutionError({
        code: "CUT_LOG_VOID_NOT_ALLOWED",
        message: "Cut log already voided",
        status: 409,
      }),
    )

    const handler = createVoidCutLogHandler({
      parsePayload,
      voidCutLog,
    })

    await expect(handler({ data: samplePayload })).rejects.toBeInstanceOf(UnrecoverableError)
  })

  it("propagates non-domain errors so BullMQ can retry", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const transportError = new Error("postgres connection refused")
    const voidCutLog = vi.fn().mockRejectedValue(transportError)

    const handler = createVoidCutLogHandler({
      parsePayload,
      voidCutLog,
    })

    await expect(handler({ data: samplePayload })).rejects.toBe(transportError)
  })
})
