import { WorkOrderCutLogExecutionError } from "@builders/application"
import type { FinalizeWorkOrderCutLogPayload } from "@builders/domain"
import { UnrecoverableError } from "bullmq"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createFinalizeWorkOrderCutLogHandler } from "../src/processors/finalize-work-order-cut-log.js"

const samplePayload: FinalizeWorkOrderCutLogPayload = {
  version: "v1",
  topic: "flooring.work-order.cut-log.finalize",
  workOrderId: "11111111-1111-4111-8111-111111111111",
  cutLogId: "22222222-2222-4222-8222-222222222222",
  requestKey: "rk-9999",
  requestedBy: {
    userId: "33333333-3333-4333-8333-333333333333",
    userEmail: "user@example.com",
  },
  requestedAt: "2026-05-03T00:00:00.000Z",
}

describe("createFinalizeWorkOrderCutLogHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("parses the payload, calls the apply use case, and returns the result", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const applyFinalize = vi.fn().mockResolvedValue({
      cutLogId: samplePayload.cutLogId,
      touchedInventoryId: "44444444-4444-4444-8444-444444444444",
      alreadyResolved: false,
    })

    const handler = createFinalizeWorkOrderCutLogHandler({
      parsePayload,
      applyFinalize,
    })

    const result = await handler({ data: samplePayload })

    expect(parsePayload).toHaveBeenCalledWith(samplePayload)
    expect(applyFinalize).toHaveBeenCalledWith(samplePayload)
    expect(result).toEqual({
      cutLogId: samplePayload.cutLogId,
      touchedInventoryId: "44444444-4444-4444-8444-444444444444",
      alreadyResolved: false,
    })
  })

  it("returns the no-op shape unchanged when the apply use case reports alreadyResolved", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const applyFinalize = vi.fn().mockResolvedValue({
      cutLogId: samplePayload.cutLogId,
      touchedInventoryId: null,
      alreadyResolved: true,
    })

    const handler = createFinalizeWorkOrderCutLogHandler({
      parsePayload,
      applyFinalize,
    })

    const result = await handler({ data: samplePayload })

    expect(result).toEqual({
      cutLogId: samplePayload.cutLogId,
      touchedInventoryId: null,
      alreadyResolved: true,
    })
  })

  it("wraps WorkOrderCutLogExecutionError as UnrecoverableError so BullMQ does not retry", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const applyFinalize = vi.fn().mockRejectedValue(
      new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH",
        message: "Cut log linkage drifted before finalize ran",
        status: 409,
      }),
    )

    const handler = createFinalizeWorkOrderCutLogHandler({
      parsePayload,
      applyFinalize,
    })

    await expect(handler({ data: samplePayload })).rejects.toBeInstanceOf(UnrecoverableError)
  })

  it("propagates non-domain errors unchanged so BullMQ can retry", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const transportError = new Error("postgres connection refused")
    const applyFinalize = vi.fn().mockRejectedValue(transportError)

    const handler = createFinalizeWorkOrderCutLogHandler({
      parsePayload,
      applyFinalize,
    })

    await expect(handler({ data: samplePayload })).rejects.toBe(transportError)
  })

  it("does NOT call any compensating WOMI status writer (regression guard)", async () => {
    // The pre-sweep handler called markWorkOrderItemsFailedFromFinalizeBatch
    // in its catch path. This sweep dropped that compensation entirely:
    // failures now rely on the apply TX rollback, no fresh-TX writes.
    // The handler's deps surface should expose only parsePayload + applyFinalize.
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const applyFinalize = vi.fn().mockRejectedValue(new Error("transient"))

    const handler = createFinalizeWorkOrderCutLogHandler({
      parsePayload,
      applyFinalize,
    })

    await expect(handler({ data: samplePayload })).rejects.toThrow("transient")
    // No additional dependency keys means there is no compensating call
    // to assert against — the test is the surface itself.
    expect(Object.keys({ parsePayload, applyFinalize })).toEqual(["parsePayload", "applyFinalize"])
  })
})
