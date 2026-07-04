import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, createEntityRecordMock, PrismaKnownError } = vi.hoisted(
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
      createEntityRecordMock: vi.fn(),
      PrismaKnownError,
    }
  },
)

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  createEntityRecord: createEntityRecordMock,
}))

import { createEntityUseCase } from "../../src/entities/create-entity.js"
import { EntityExecutionError } from "../../src/entities/errors.js"

const ACTOR = "actor@example.com"

function input(overrides: Record<string, unknown> = {}) {
  return {
    entity: "Acme",
    streetAddress: null,
    city: null,
    state: null,
    postalCode: null,
    phone: null,
    email: null,
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  createEntityRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  createEntityRecordMock.mockResolvedValue({ id: "entity-1", entity: "Acme" })
})

describe("createEntityUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(createEntityUseCase(input() as never, "   ")).rejects.toThrowError(/actorEmail/)
    expect(createEntityRecordMock).not.toHaveBeenCalled()
  })

  it("rejects a blank name with 400 and never inserts", async () => {
    await expect(
      createEntityUseCase(input({ entity: "  " }) as never, ACTOR),
    ).rejects.toMatchObject({
      code: "ENTITY_VALIDATION_FAILED",
      status: 400,
      field: "entity",
    })
    expect(createEntityRecordMock).not.toHaveBeenCalled()
  })

  it("returns the created record on success", async () => {
    const created = { id: "entity-9", entity: "Acme" }
    createEntityRecordMock.mockResolvedValue(created)
    expect(await createEntityUseCase(input() as never, ACTOR)).toBe(created)
  })

  it("persists the record, stamping createdBy/updatedBy", async () => {
    const created = { id: "entity-9", entity: "Acme" }
    createEntityRecordMock.mockResolvedValue(created)

    const result = await createEntityUseCase(input({ entity: "Acme" }) as never, ACTOR)

    expect(result).toBe(created)
    expect(createEntityRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "Acme", createdBy: ACTOR, updatedBy: ACTOR }),
      expect.anything(),
    )
  })

  it("re-throws unexpected database errors unchanged", async () => {
    createEntityRecordMock.mockRejectedValue(new Error("boom"))
    await expect(createEntityUseCase(input() as never, ACTOR)).rejects.toThrowError("boom")
    await expect(createEntityUseCase(input() as never, ACTOR)).rejects.not.toBeInstanceOf(
      EntityExecutionError,
    )
  })

  it("maps a bad typeId FK violation (P2003) to a 400", async () => {
    createEntityRecordMock.mockRejectedValue(new PrismaKnownError("fk", { code: "P2003" }))
    await expect(createEntityUseCase(input() as never, ACTOR)).rejects.toMatchObject({
      code: "ENTITY_INVALID_TYPE",
      status: 400,
      field: "typeIds",
    })
  })
})
