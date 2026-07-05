import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, applyTemplatePlannedPaymentsDiffMock } = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    applyTemplatePlannedPaymentsDiffMock: vi.fn(),
  }
})

vi.mock("@builders/db", () => ({
  Prisma: {},
  withDatabaseTransaction: withDatabaseTransactionMock,
  applyTemplatePlannedPaymentsDiff: applyTemplatePlannedPaymentsDiffMock,
}))

import { saveTemplatePlannedPaymentsSectionUseCase } from "../../src/templates/planned-payments/save-template-planned-payments-section.js"

const ACTOR = "actor@example.com"
const EMPTY_DIFF = { added: [], modified: [], deleted: [] }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  applyTemplatePlannedPaymentsDiffMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  applyTemplatePlannedPaymentsDiffMock.mockResolvedValue({ plannedPayments: [], tempIdMap: {} })
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
          added: [{ tempId: "t1", form: { amount: "10.00", direction: "REVENUE", paymentDate: "" } }],
          modified: [],
          deleted: [],
        },
      } as never,
      ACTOR,
    )
    const [, diff] = applyTemplatePlannedPaymentsDiffMock.mock.calls[0]
    expect(diff.added[0].tempId).toBe("t1")
    expect(diff.added[0].id).toBeTruthy()
    expect(diff.added[0].input).toMatchObject({ amount: "10.00", direction: "REVENUE" })
  })

  it("rejects an ADDED row with a non-positive amount before writing", async () => {
    await expect(
      saveTemplatePlannedPaymentsSectionUseCase(
        {
          templateId: "tpl-1",
          diff: {
            added: [{ tempId: "t1", form: { amount: "0", direction: "REVENUE", paymentDate: "" } }],
            modified: [],
            deleted: [],
          },
        } as never,
        ACTOR,
      ),
    ).rejects.toMatchObject({ code: "TEMPLATE_PLANNED_PAYMENT_VALIDATION_FAILED", status: 400 })
    expect(applyTemplatePlannedPaymentsDiffMock).not.toHaveBeenCalled()
  })
})
