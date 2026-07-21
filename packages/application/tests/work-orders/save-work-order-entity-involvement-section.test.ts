import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  applyWorkOrderEntityInvolvementsDiffMock,
  listWorkOrderEntityInvolvementsMock,
} = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    applyWorkOrderEntityInvolvementsDiffMock: vi.fn(),
    listWorkOrderEntityInvolvementsMock: vi.fn(),
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
    applyWorkOrderEntityInvolvementsDiff: applyWorkOrderEntityInvolvementsDiffMock,
    listWorkOrderEntityInvolvements: listWorkOrderEntityInvolvementsMock,
  }
})

import { Prisma } from "@builders/db"
import { saveWorkOrderEntityInvolvementSectionUseCase } from "../../src/work-orders/entity-involvement/save-work-order-entity-involvement-section.js"

const ACTOR = "actor@example.com"
const EMPTY_DIFF = { added: [], modified: [], deleted: [] }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  applyWorkOrderEntityInvolvementsDiffMock.mockReset()
  listWorkOrderEntityInvolvementsMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  // The applier now returns only tempIdMap; the list is enriched on the pool.
  applyWorkOrderEntityInvolvementsDiffMock.mockResolvedValue({ tempIdMap: {} })
  listWorkOrderEntityInvolvementsMock.mockResolvedValue([])
})

describe("saveWorkOrderEntityInvolvementSectionUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      saveWorkOrderEntityInvolvementSectionUseCase(
        { workOrderId: "wo-1", diff: EMPTY_DIFF } as never,
        "   ",
      ),
    ).rejects.toThrowError(/actorEmail/)
    expect(applyWorkOrderEntityInvolvementsDiffMock).not.toHaveBeenCalled()
  })

  it("forwards the actorEmail + workOrderId to the diff writer", async () => {
    await saveWorkOrderEntityInvolvementSectionUseCase(
      { workOrderId: "wo-1", diff: EMPTY_DIFF } as never,
      ACTOR,
    )
    expect(applyWorkOrderEntityInvolvementsDiffMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ workOrderId: "wo-1", actorEmail: ACTOR }),
    )
  })

  it("assigns a real id to an ADDED row and passes the form through", async () => {
    await saveWorkOrderEntityInvolvementSectionUseCase(
      {
        workOrderId: "wo-1",
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
    const [, diff] = applyWorkOrderEntityInvolvementsDiffMock.mock.calls[0]
    expect(diff.added[0].tempId).toBe("t1")
    expect(diff.added[0].id).toBeTruthy()
    expect(diff.added[0].input).toMatchObject({
      entityId: "ent-1",
      involvementType: "Sales Rep",
    })
  })

  it("maps a P2003 FK violation from the diff writer to LINK_INVALID", async () => {
    applyWorkOrderEntityInvolvementsDiffMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("FK", { code: "P2003" }),
    )
    await expect(
      saveWorkOrderEntityInvolvementSectionUseCase(
        {
          workOrderId: "wo-1",
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
      code: "WORK_ORDER_ENTITY_INVOLVEMENT_LINK_INVALID",
      status: 400,
      field: "entityId",
    })
  })
})
