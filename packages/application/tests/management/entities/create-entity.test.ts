import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, createEntityRecordMock } = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    createEntityRecordMock: vi.fn(),
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  createEntityRecord: createEntityRecordMock,
}))

import { createEntityUseCase } from "../../../src/management/entities/create-entity.js"
import { EntityExecutionError } from "../../../src/management/entities/errors.js"

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
  it("rejects a blank name with 400 and never inserts", async () => {
    await expect(createEntityUseCase(input({ entity: "  " }) as never)).rejects.toMatchObject({
      code: "ENTITY_VALIDATION_FAILED",
      status: 400,
      field: "entity",
    })
    expect(createEntityRecordMock).not.toHaveBeenCalled()
  })

  it("returns the created record on success", async () => {
    const created = { id: "entity-9", entity: "Acme" }
    createEntityRecordMock.mockResolvedValue(created)
    expect(await createEntityUseCase(input() as never)).toBe(created)
  })

  it("re-throws unexpected database errors unchanged", async () => {
    createEntityRecordMock.mockRejectedValue(new Error("boom"))
    await expect(createEntityUseCase(input() as never)).rejects.toThrowError("boom")
    await expect(createEntityUseCase(input() as never)).rejects.not.toBeInstanceOf(
      EntityExecutionError,
    )
  })
})
