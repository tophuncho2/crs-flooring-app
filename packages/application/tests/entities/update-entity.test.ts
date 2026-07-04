import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, updateEntityRecordMock, PrismaKnownError } = vi.hoisted(
  () => {
    class PrismaKnownError extends Error {
      code: string
      meta?: { target?: string[] }
      constructor(message: string, opts: { code: string; meta?: { target?: string[] } }) {
        super(message)
        this.code = opts.code
        this.meta = opts.meta
      }
    }
    return {
      withDatabaseTransactionMock: vi.fn(),
      updateEntityRecordMock: vi.fn(),
      PrismaKnownError,
    }
  },
)

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  updateEntityRecord: updateEntityRecordMock,
}))

import { updateEntityUseCase } from "../../src/entities/update-entity.js"

const ID = "entity-1"
const ACTOR = "actor@example.com"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  updateEntityRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  updateEntityRecordMock.mockResolvedValue({ id: ID, entity: "Acme" })
})

describe("updateEntityUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(updateEntityUseCase(ID, { phone: "x" } as never, "   ")).rejects.toThrowError(
      /actorEmail/,
    )
    expect(updateEntityRecordMock).not.toHaveBeenCalled()
  })

  it("forwards the input and stamps updatedBy when name is omitted", async () => {
    await updateEntityUseCase(ID, { phone: "555" } as never, ACTOR)
    expect(updateEntityRecordMock).toHaveBeenCalledWith(
      ID,
      { phone: "555", updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("forwards the palette color verbatim (metadata-only, no recompute)", async () => {
    await updateEntityUseCase(ID, { color: "VIOLET" } as never, ACTOR)
    expect(updateEntityRecordMock).toHaveBeenCalledWith(
      ID,
      { color: "VIOLET", updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("rejects a blank name when one is supplied", async () => {
    await expect(
      updateEntityUseCase(ID, { entity: "   " } as never, ACTOR),
    ).rejects.toMatchObject({
      code: "ENTITY_VALIDATION_FAILED",
      status: 400,
    })
    expect(updateEntityRecordMock).not.toHaveBeenCalled()
  })

  it("returns the updated record on success", async () => {
    const updated = { id: ID, entity: "Renamed" }
    updateEntityRecordMock.mockResolvedValue(updated)
    expect(await updateEntityUseCase(ID, { entity: "Renamed" } as never, ACTOR)).toBe(updated)
  })

  it("maps a P2025 to a 404 not-found", async () => {
    updateEntityRecordMock.mockRejectedValue(new PrismaKnownError("missing", { code: "P2025" }))
    await expect(
      updateEntityUseCase(ID, { entity: "Renamed" } as never, ACTOR),
    ).rejects.toMatchObject({
      code: "ENTITY_NOT_FOUND",
      status: 404,
    })
  })

  it("maps a bad typeId FK violation (P2003) to a 400", async () => {
    updateEntityRecordMock.mockRejectedValue(new PrismaKnownError("fk", { code: "P2003" }))
    await expect(
      updateEntityUseCase(ID, { typeIds: ["missing"] } as never, ACTOR),
    ).rejects.toMatchObject({
      code: "ENTITY_INVALID_TYPE",
      status: 400,
      field: "typeIds",
    })
  })
})
