import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  getEntityByIdMock,
  createEntityRecordMock,
  createPropertyRecordMock,
  updatePropertyRecordMock,
  PrismaKnownError,
} = vi.hoisted(() => {
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
    getEntityByIdMock: vi.fn(),
    createEntityRecordMock: vi.fn(),
    createPropertyRecordMock: vi.fn(),
    updatePropertyRecordMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  getEntityById: getEntityByIdMock,
  createEntityRecord: createEntityRecordMock,
  createPropertyRecord: createPropertyRecordMock,
  updatePropertyRecord: updatePropertyRecordMock,
}))

import { createPropertyHubUseCase } from "../../src/properties/create-property-hub.js"

const ACTOR = "actor@example.com"

function entityFields(overrides: Record<string, unknown> = {}) {
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

function propFields(overrides: Record<string, unknown> = {}) {
  return {
    name: "Maple Court",
    streetAddress: null,
    city: null,
    state: null,
    postalCode: null,
    phone: null,
    email: null,
    instructions: null,
    ...overrides,
  }
}

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  getEntityByIdMock.mockReset()
  createEntityRecordMock.mockReset()
  createPropertyRecordMock.mockReset()
  updatePropertyRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  getEntityByIdMock.mockResolvedValue({ id: "entity-1", entity: "Acme" })
  createEntityRecordMock.mockResolvedValue({ id: "entity-1", entity: "Acme" })
  createPropertyRecordMock.mockResolvedValue({ id: "prop-1", name: "Maple Court" })
  updatePropertyRecordMock.mockResolvedValue({ id: "prop-1", name: "Maple Court" })
})

describe("createPropertyHubUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      createPropertyHubUseCase(
        {
          entity: { mode: "none" },
          property: { mode: "create", fields: propFields() },
        } as never,
        "   ",
      ),
    ).rejects.toThrowError(/actorEmail/)
    expect(createPropertyRecordMock).not.toHaveBeenCalled()
  })

  it("rejects an empty form (no entity create, no property create) with 400", async () => {
    await expect(
      createPropertyHubUseCase(
        {
          entity: { mode: "none" },
          property: { mode: "none" },
        } as never,
        ACTOR,
      ),
    ).rejects.toMatchObject({ code: "PROPERTY_VALIDATION_FAILED", status: 400 })
    expect(createPropertyRecordMock).not.toHaveBeenCalled()
    expect(createEntityRecordMock).not.toHaveBeenCalled()
  })

  it("maps a missing linked entity to a 404", async () => {
    getEntityByIdMock.mockRejectedValue(new PrismaKnownError("missing", { code: "P2025" }))
    await expect(
      createPropertyHubUseCase(
        {
          entity: { mode: "link", id: "entity-x" },
          property: { mode: "create", fields: propFields() },
        } as never,
        ACTOR,
      ),
    ).rejects.toMatchObject({ code: "ENTITY_NOT_FOUND", status: 404 })
  })

  it("creates both records, threads the new entity id, and stamps the actor on the property", async () => {
    createEntityRecordMock.mockResolvedValue({ id: "entity-9", entity: "Acme" })
    createPropertyRecordMock.mockResolvedValue({ id: "prop-9", name: "Maple Court" })

    const result = await createPropertyHubUseCase(
      {
        entity: { mode: "create", fields: entityFields() },
        property: { mode: "create", fields: propFields({ name: "Maple Court" }) },
      } as never,
      ACTOR,
    )

    expect(result).toEqual({
      entity: { id: "entity-9", entity: "Acme" },
      property: { id: "prop-9", name: "Maple Court" },
    })
    expect(createPropertyRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: "entity-9",
        name: "Maple Court",
        createdBy: ACTOR,
        updatedBy: ACTOR,
      }),
      expect.anything(),
    )
  })

  it("links an existing entity and threads its id into the created property", async () => {
    getEntityByIdMock.mockResolvedValue({ id: "entity-7", entity: "Linked" })
    createPropertyRecordMock.mockResolvedValue({ id: "prop-7", name: "Maple Court" })

    const result = await createPropertyHubUseCase(
      {
        entity: { mode: "link", id: "entity-7" },
        property: { mode: "create", fields: propFields() },
      } as never,
      ACTOR,
    )

    expect(result.entity).toEqual({ id: "entity-7", entity: "Linked" })
    expect(createEntityRecordMock).not.toHaveBeenCalled()
    expect(createPropertyRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: "entity-7" }),
      expect.anything(),
    )
  })

  it("creates a new entity and links it to an existing property, stamping updatedBy", async () => {
    createEntityRecordMock.mockResolvedValue({ id: "entity-3", entity: "Acme" })
    updatePropertyRecordMock.mockResolvedValue({ id: "prop-3", name: "Maple Court" })

    const result = await createPropertyHubUseCase(
      {
        entity: { mode: "create", fields: entityFields() },
        property: { mode: "link", id: "prop-3" },
      } as never,
      ACTOR,
    )

    expect(result.entity).toEqual({ id: "entity-3", entity: "Acme" })
    expect(result.property).toEqual({ id: "prop-3", name: "Maple Court" })
    expect(createPropertyRecordMock).not.toHaveBeenCalled()
    expect(updatePropertyRecordMock).toHaveBeenCalledWith(
      "prop-3",
      { entityId: "entity-3", updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("rejects linking a property with no entity action", async () => {
    await expect(
      createPropertyHubUseCase(
        {
          entity: { mode: "none" },
          property: { mode: "link", id: "prop-3" },
        } as never,
        ACTOR,
      ),
    ).rejects.toMatchObject({ code: "PROPERTY_VALIDATION_FAILED", status: 400 })
    expect(updatePropertyRecordMock).not.toHaveBeenCalled()
  })

  it("creates a property alone with a null entity", async () => {
    const result = await createPropertyHubUseCase(
      {
        entity: { mode: "none" },
        property: { mode: "create", fields: propFields() },
      } as never,
      ACTOR,
    )

    expect(result.entity).toBeNull()
    expect(result.property).toEqual({ id: "prop-1", name: "Maple Court" })
    expect(createPropertyRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: null }),
      expect.anything(),
    )
  })
})
