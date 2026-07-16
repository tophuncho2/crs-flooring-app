import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  withDatabaseTransactionMock,
  applyTemplatePlannedPaymentsDiffMock,
  listTemplatePlannedPaymentsMock,
} = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    applyTemplatePlannedPaymentsDiffMock: vi.fn(),
    listTemplatePlannedPaymentsMock: vi.fn(),
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
    applyTemplatePlannedPaymentsDiff: applyTemplatePlannedPaymentsDiffMock,
    listTemplatePlannedPayments: listTemplatePlannedPaymentsMock,
  }
})

import { Prisma } from "@builders/db"
import { saveTemplatePlannedPaymentsSectionUseCase } from "../../src/templates/planned-payments/save-template-planned-payments-section.js"

const ACTOR = "actor@example.com"
const EMPTY_DIFF = { added: [], modified: [], deleted: [] }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  applyTemplatePlannedPaymentsDiffMock.mockReset()
  listTemplatePlannedPaymentsMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  // The applier now returns only tempIdMap; the list is enriched on the pool.
  applyTemplatePlannedPaymentsDiffMock.mockResolvedValue({ tempIdMap: {} })
  listTemplatePlannedPaymentsMock.mockResolvedValue([])
})

describe("saveTemplatePlannedPaymentsSectionUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      saveTemplatePlannedPaymentsSectionUseCase({ templateId: "tpl-1", diff: EMPTY_DIFF } as never, "   "),
    ).rejects.toThrowError(/actorEmail/)
    expect(applyTemplatePlannedPaymentsDiffMock).not.toHaveBeenCalled()
  })

  it("forwards the actorEmail + templateId to the diff writer", async () => {
    await saveTemplatePlannedPaymentsSectionUseCase(
      { templateId: "tpl-1", diff: EMPTY_DIFF } as never,
      ACTOR,
    )
    expect(applyTemplatePlannedPaymentsDiffMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ templateId: "tpl-1", actorEmail: ACTOR }),
    )
  })

  it("assigns a real id to an ADDED row and passes the form through", async () => {
    await saveTemplatePlannedPaymentsSectionUseCase(
      {
        templateId: "tpl-1",
        diff: {
          added: [
            {
              tempId: "t1",
              form: {
                amount: "10.00",
                direction: "REVENUE",
                notes: "deposit",
                entityId: "ent-1",
                paymentPurposeId: "pp-1",
              },
            },
          ],
          modified: [],
          deleted: [],
        },
      } as never,
      ACTOR,
    )
    const [, diff] = applyTemplatePlannedPaymentsDiffMock.mock.calls[0]
    expect(diff.added[0].tempId).toBe("t1")
    expect(diff.added[0].id).toBeTruthy()
    expect(diff.added[0].input).toMatchObject({
      amount: "10.00",
      direction: "REVENUE",
      notes: "deposit",
      entityId: "ent-1",
      paymentPurposeId: "pp-1",
    })
  })

  it("rejects an ADDED row with a non-positive amount before writing", async () => {
    await expect(
      saveTemplatePlannedPaymentsSectionUseCase(
        {
          templateId: "tpl-1",
          diff: {
            added: [{ tempId: "t1", form: { amount: "0", direction: "REVENUE" } }],
            modified: [],
            deleted: [],
          },
        } as never,
        ACTOR,
      ),
    ).rejects.toMatchObject({ code: "TEMPLATE_PLANNED_PAYMENT_VALIDATION_FAILED", status: 400 })
    expect(applyTemplatePlannedPaymentsDiffMock).not.toHaveBeenCalled()
  })

  it("maps a P2003 FK violation from the diff writer to LINK_INVALID", async () => {
    applyTemplatePlannedPaymentsDiffMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("FK", { code: "P2003" }),
    )
    await expect(
      saveTemplatePlannedPaymentsSectionUseCase(
        {
          templateId: "tpl-1",
          diff: {
            added: [
              {
                tempId: "t1",
                form: {
                  amount: "10.00",
                  direction: "REVENUE",
                  notes: "",
                  entityId: "missing-entity",
                },
              },
            ],
            modified: [],
            deleted: [],
          },
        } as never,
        ACTOR,
      ),
    ).rejects.toMatchObject({
      code: "TEMPLATE_PLANNED_PAYMENT_LINK_INVALID",
      status: 400,
      field: "entityId",
    })
  })

  it("attributes a P2003 to paymentPurposeId when the failing FK names it", async () => {
    applyTemplatePlannedPaymentsDiffMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("FK", {
        code: "P2003",
        // Prisma 7's real P2003 shape: meta.constraint is an object naming the
        // failing FK's column(s). (Legacy `field_name` no longer exists.)
        meta: { constraint: { fields: ["paymentPurposeId"] } },
      }),
    )
    await expect(
      saveTemplatePlannedPaymentsSectionUseCase(
        {
          templateId: "tpl-1",
          diff: {
            added: [
              {
                tempId: "t1",
                form: {
                  amount: "10.00",
                  direction: "REVENUE",
                  notes: "",
                  entityId: null,
                  paymentPurposeId: "missing-purpose",
                },
              },
            ],
            modified: [],
            deleted: [],
          },
        } as never,
        ACTOR,
      ),
    ).rejects.toMatchObject({
      code: "TEMPLATE_PLANNED_PAYMENT_LINK_INVALID",
      status: 400,
      field: "paymentPurposeId",
    })
  })
})
