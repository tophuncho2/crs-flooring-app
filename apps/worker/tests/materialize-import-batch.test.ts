import { StagedInventoryExecutionError } from "@builders/application"
import {
  type ImportMaterializeBatchPayload,
  parseImportMaterializeBatchPayload,
} from "@builders/domain"
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

  it("propagates parsePayload errors as-is (NOT wrapped as UnrecoverableError)", async () => {
    // parsePayload runs OUTSIDE the try/catch in the handler. A schema
    // violation surfaces the underlying error directly — BullMQ retries
    // per job options. (This pins current behavior; if we ever want
    // payload-schema failures to be terminal, this test will need to flip.)
    const parseError = new Error("invalid payload shape")
    const parsePayload = vi.fn().mockImplementation(() => {
      throw parseError
    })
    const materializeImportedStagedRows = vi.fn()

    const handler = createMaterializeImportBatchHandler({
      parsePayload,
      materializeImportedStagedRows,
    })

    await expect(handler({ data: { garbage: true } })).rejects.toBe(parseError)
    expect(materializeImportedStagedRows).not.toHaveBeenCalled()
  })

  it("with default dependencies, real Zod parser rejects a malformed payload", async () => {
    // The factory's default `parsePayload` is the production
    // `parseImportMaterializeBatchPayload` from @builders/domain. This
    // pins the wiring: an invalid payload at runtime fails the schema
    // here, before the use case runs.
    const materializeImportedStagedRows = vi.fn()

    const handler = createMaterializeImportBatchHandler({
      parsePayload: parseImportMaterializeBatchPayload,
      materializeImportedStagedRows,
    })

    await expect(
      handler({ data: { ...samplePayload, stagedRowIds: [] } }),
    ).rejects.toBeInstanceOf(Error)
    await expect(
      handler({ data: { ...samplePayload, importEntryId: "not-a-uuid" } }),
    ).rejects.toBeInstanceOf(Error)
    expect(materializeImportedStagedRows).not.toHaveBeenCalled()
  })

  it("ignores extra fields on the BullMQ job envelope (only reads job.data)", async () => {
    const parsePayload = vi.fn().mockReturnValue(samplePayload)
    const materializeImportedStagedRows = vi.fn().mockResolvedValue({
      created: [],
      materializedStagedRowIds: [],
    })

    const handler = createMaterializeImportBatchHandler({
      parsePayload,
      materializeImportedStagedRows,
    })

    // Real BullMQ jobs carry id, name, opts, etc. The handler must only
    // touch `data` — otherwise upgrading BullMQ could break us.
    await handler({
      data: samplePayload,
      id: "job-abc",
      name: "materialize-batch",
      opts: { jobId: "job-abc" },
    } as unknown as { data: unknown })

    expect(parsePayload).toHaveBeenCalledWith(samplePayload)
    expect(parsePayload).toHaveBeenCalledTimes(1)
  })

  it("wraps every StagedInventoryExecutionError code, not just the precondition one", async () => {
    // Domain errors are terminal regardless of code — wrap → UnrecoverableError.
    const cases = [
      { code: "STAGED_PARENT_NOT_FOUND", status: 404 },
      { code: "STAGED_BATCH_INELIGIBLE", status: 400 },
      { code: "STAGED_BATCH_RACE", status: 409 },
      { code: "STAGED_MATERIALIZE_PRECONDITION_FAILED", status: 409 },
    ] as const

    for (const { code, status } of cases) {
      const parsePayload = vi.fn().mockReturnValue(samplePayload)
      const materializeImportedStagedRows = vi.fn().mockRejectedValue(
        new StagedInventoryExecutionError({
          code,
          message: `boom ${code}`,
          status,
        }),
      )
      const handler = createMaterializeImportBatchHandler({
        parsePayload,
        materializeImportedStagedRows,
      })

      await expect(handler({ data: samplePayload })).rejects.toBeInstanceOf(UnrecoverableError)
    }
  })

  it("factory is callable with no dependencies (uses production defaults)", () => {
    // No assertion needed beyond "this doesn't throw at construction":
    // the production wiring (worker bootstrap) calls
    // createMaterializeImportBatchHandler() with no args.
    expect(() => createMaterializeImportBatchHandler()).not.toThrow()
  })
})
