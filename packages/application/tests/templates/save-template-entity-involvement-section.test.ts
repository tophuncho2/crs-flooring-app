import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  applyTemplateEntityInvolvementsDiffMock,
  listTemplateEntityInvolvementsMock,
} = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    applyTemplateEntityInvolvementsDiffMock: vi.fn(),
    listTemplateEntityInvolvementsMock: vi.fn(),
  }
})

vi.mock("@builders/db", () => {
  // Minimal stand-in so the use case's `error instanceof
  // Prisma.PrismaClientKnownRequestError` FK-mapping branch is exercisable.
  class PrismaClientKnownRequestError extends Error {
    code: string
    meta?: Record<string, unknown>
    constructor(message: string, options: { code: string; meta?: Record<string, unknown> }) {
      super(message)
      this.code = options.code
      this.meta = options.meta
    }
  }
  return {
    Prisma: { PrismaClientKnownRequestError },
    // Pool sentinel — the use case enriches on `client ?? db`.
    db: {},
    withDatabaseTransaction: withDatabaseTransactionMock,
    applyTemplateEntityInvolvementsDiff: applyTemplateEntityInvolvementsDiffMock,
    listTemplateEntityInvolvements: listTemplateEntityInvolvementsMock,
  }
})

import { Prisma } from "@builders/db"
import { saveTemplateEntityInvolvementSectionUseCase } from "../../src/templates/entity-involvement/save-template-entity-involvement-section.js"

const ACTOR = "actor@example.com"
const EMPTY_DIFF = { added: [], modified: [], deleted: [] }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  applyTemplateEntityInvolvementsDiffMock.mockReset()
  listTemplateEntityInvolvementsMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  // The applier now returns only tempIdMap; the list is enriched on the pool.
  applyTemplateEntityInvolvementsDiffMock.mockResolvedValue({ tempIdMap: {} })
  listTemplateEntityInvolvementsMock.mockResolvedValue([])
})

describe("saveTemplateEntityInvolvementSectionUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      saveTemplateEntityInvolvementSectionUseCase(
        { templateId: "tpl-1", diff: EMPTY_DIFF } as never,
        "   ",
      ),
    ).rejects.toThrowError(/actorEmail/)
    expect(applyTemplateEntityInvolvementsDiffMock).not.toHaveBeenCalled()
  })

  it("forwards the actorEmail + templateId to the diff writer", async () => {
    await saveTemplateEntityInvolvementSectionUseCase(
      { templateId: "tpl-1", diff: EMPTY_DIFF } as never,
      ACTOR,
    )
    expect(applyTemplateEntityInvolvementsDiffMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ templateId: "tpl-1", actorEmail: ACTOR }),
    )
  })

  it("assigns a real id to an ADDED row and passes the form through", async () => {
    await saveTemplateEntityInvolvementSectionUseCase(
      {
        templateId: "tpl-1",
        diff: {
          added: [
            {
              tempId: "t1",
              form: { entityId: "ent-1", involvementType: "Sales Rep" },
            },
          ],
          modified: [],
          deleted: [],
        },
      } as never,
      ACTOR,
    )
    const [, diff] = applyTemplateEntityInvolvementsDiffMock.mock.calls[0]
    expect(diff.added[0].tempId).toBe("t1")
    expect(diff.added[0].id).toBeTruthy()
    expect(diff.added[0].input).toMatchObject({
      entityId: "ent-1",
      involvementType: "Sales Rep",
    })
  })

  it("maps a P2003 FK violation from the diff writer to LINK_INVALID", async () => {
    applyTemplateEntityInvolvementsDiffMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("FK", { code: "P2003" }),
    )
    await expect(
      saveTemplateEntityInvolvementSectionUseCase(
        {
          templateId: "tpl-1",
          diff: {
            added: [
              {
                tempId: "t1",
                form: { entityId: "missing-entity", involvementType: "" },
              },
            ],
            modified: [],
            deleted: [],
          },
        } as never,
        ACTOR,
      ),
    ).rejects.toMatchObject({
      code: "TEMPLATE_ENTITY_INVOLVEMENT_LINK_INVALID",
      status: 400,
      field: "entityId",
    })
  })
})
