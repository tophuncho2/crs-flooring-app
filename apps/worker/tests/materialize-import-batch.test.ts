import { StagedInventoryExecutionError } from "@builders/application"
import type { ImportMaterializeBatchPayload } from "@builders/domain"
import { UnrecoverableError } from "bullmq"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMaterializeImportBatchHandler } from "../src/processors/materialize-import-batch.js"

const samplePayload: ImportMaterializeBatchPayload = {
  version: "v1",
  topic: "flooring.imports.materialize",
  importEntryId: "11111111-1111-4111-8111-111111111111",
  stagedRowIds: ["22222222-2222-4222-8222-222222222222"],
  requestedBy: {
    userId: "33333333-3333-4333-8333-333333333333",
    userEmail: "user@example.com",
  },
  requestedAt: "2026-04-25T00:00:00.000Z",
}

describe("createMaterializeImportBatchHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("parses the payload, calls the use case, and returns the result", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const materializeImportedStagedRows = vi.fn().mockResolvedValue({
      created: [
        { id: "inventory-1", inventoryNumber: "INV-00001" },
      ],
      materializedStagedRowIds: samplePayload.stagedRowIds,
    })

    const handler = createMaterializeImportBatchHandler({
      parsePayload,
      materializeImportedStagedRows,
    })

    const result = await handler({ data: samplePayload })

    expect(parsePayload).toHaveBeenCalledWith(samplePayload)
    expect(materializeImportedStagedRows).toHaveBeenCalledWith(samplePayload)
    expect(result).toEqual({
      created: [{ id: "inventory-1", inventoryNumber: "INV-00001" }],
      materializedStagedRowIds: samplePayload.stagedRowIds,
    })
  })

  it("wraps StagedInventoryExecutionError as UnrecoverableError", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const materializeImportedStagedRows = vi.fn().mockRejectedValue(
      new StagedInventoryExecutionError({
        code: "STAGED_MATERIALIZE_PRECONDITION_FAILED",
        message: "Staged rows changed state",
        status: 409,
      }),
    )

    const handler = createMaterializeImportBatchHandler({
      parsePayload,
      materializeImportedStagedRows,
    })

    await expect(handler({ data: samplePayload })).rejects.toBeInstanceOf(UnrecoverableError)
  })

  it("propagates non-domain errors so BullMQ can retry", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const transportError = new Error("postgres connection refused")
    const materializeImportedStagedRows = vi.fn().mockRejectedValue(transportError)

    const handler = createMaterializeImportBatchHandler({
      parsePayload,
      materializeImportedStagedRows,
    })

    await expect(handler({ data: samplePayload })).rejects.toBe(transportError)
  })
})
