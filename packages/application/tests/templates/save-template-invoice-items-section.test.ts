import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, applyTemplateInvoiceItemsDiffMock } = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    applyTemplateInvoiceItemsDiffMock: vi.fn(),
  }
})

vi.mock("@builders/db", () => {
  class PrismaClientKnownRequestError extends Error {
    code: string
    constructor(message: string, options: { code: string }) {
      super(message)
      this.code = options.code
    }
  }
  return {
    Prisma: { PrismaClientKnownRequestError },
    withDatabaseTransaction: withDatabaseTransactionMock,
    applyTemplateInvoiceItemsDiff: applyTemplateInvoiceItemsDiffMock,
  }
})

import { saveTemplateInvoiceItemsSectionUseCase } from "../../src/templates/invoice-items/save-template-invoice-items-section.js"

const ACTOR = "actor@example.com"
const EMPTY_DIFF = { added: [], modified: [], deleted: [] }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  applyTemplateInvoiceItemsDiffMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  applyTemplateInvoiceItemsDiffMock.mockResolvedValue({ invoiceItems: [], tempIdMap: {} })
})

describe("saveTemplateInvoiceItemsSectionUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      saveTemplateInvoiceItemsSectionUseCase({ templateId: "tpl-1", diff: EMPTY_DIFF } as never, "   "),
    ).rejects.toThrowError(/actorEmail/)
    expect(applyTemplateInvoiceItemsDiffMock).not.toHaveBeenCalled()
  })

  it("forwards the actorEmail + templateId to the diff writer", async () => {
    await saveTemplateInvoiceItemsSectionUseCase(
      { templateId: "tpl-1", diff: EMPTY_DIFF } as never,
      ACTOR,
    )
    expect(applyTemplateInvoiceItemsDiffMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ templateId: "tpl-1", actorEmail: ACTOR }),
    )
  })

  it("assigns a real id to an ADDED row and passes the form through", async () => {
    await saveTemplateInvoiceItemsSectionUseCase(
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
              },
            },
          ],
          modified: [],
          deleted: [],
        },
      } as never,
      ACTOR,
    )
    const [, diff] = applyTemplateInvoiceItemsDiffMock.mock.calls[0]
    expect(diff.added[0].tempId).toBe("t1")
    expect(diff.added[0].id).toBeTruthy()
    expect(diff.added[0].input).toMatchObject({
      amount: "10.00",
      direction: "REVENUE",
      notes: "deposit",
    })
  })

  it("rejects an ADDED row with a non-positive amount before writing", async () => {
    await expect(
      saveTemplateInvoiceItemsSectionUseCase(
        {
          templateId: "tpl-1",
          diff: {
            added: [{ tempId: "t1", form: { amount: "0", direction: "REVENUE", notes: "" } }],
            modified: [],
            deleted: [],
          },
        } as never,
        ACTOR,
      ),
    ).rejects.toMatchObject({ code: "TEMPLATE_INVOICE_ITEM_VALIDATION_FAILED", status: 400 })
    expect(applyTemplateInvoiceItemsDiffMock).not.toHaveBeenCalled()
  })
})
