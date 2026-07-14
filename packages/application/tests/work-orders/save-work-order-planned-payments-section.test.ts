import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, applyWorkOrderPlannedPaymentsDiffMock } = vi.hoisted(() => {
  return {
    withDatabaseTransactionMock: vi.fn(),
    applyWorkOrderPlannedPaymentsDiffMock: vi.fn(),
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
    withDatabaseTransaction: withDatabaseTransactionMock,
    applyWorkOrderPlannedPaymentsDiff: applyWorkOrderPlannedPaymentsDiffMock,
  }
})

import { Prisma } from "@builders/db"
import { saveWorkOrderPlannedPaymentsSectionUseCase } from "../../src/work-orders/planned-payments/save-work-order-planned-payments-section.js"

const ACTOR = "actor@example.com"
const EMPTY_DIFF = { added: [], modified: [], deleted: [] }

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  applyWorkOrderPlannedPaymentsDiffMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  applyWorkOrderPlannedPaymentsDiffMock.mockResolvedValue({ plannedPayments: [], tempIdMap: {} })
})

describe("saveWorkOrderPlannedPaymentsSectionUseCase", () => {
  it("rejects a blank actorEmail before touching the database", async () => {
    await expect(
      saveWorkOrderPlannedPaymentsSectionUseCase({ workOrderId: "wo-1", diff: EMPTY_DIFF } as never, "   "),
    ).rejects.toThrowError(/actorEmail/)
    expect(applyWorkOrderPlannedPaymentsDiffMock).not.toHaveBeenCalled()
  })

  it("forwards the actorEmail + workOrderId to the diff writer", async () => {
    await saveWorkOrderPlannedPaymentsSectionUseCase(
      { workOrderId: "wo-1", diff: EMPTY_DIFF } as never,
      ACTOR,
    )
    expect(applyWorkOrderPlannedPaymentsDiffMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ workOrderId: "wo-1", actorEmail: ACTOR }),
    )
  })

  it("assigns a real id to an ADDED row and passes the form through", async () => {
    await saveWorkOrderPlannedPaymentsSectionUseCase(
      {
        workOrderId: "wo-1",
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
    const [, diff] = applyWorkOrderPlannedPaymentsDiffMock.mock.calls[0]
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
      saveWorkOrderPlannedPaymentsSectionUseCase(
        {
          workOrderId: "wo-1",
          diff: {
            added: [{ tempId: "t1", form: { amount: "0", direction: "REVENUE" } }],
            modified: [],
            deleted: [],
          },
        } as never,
        ACTOR,
      ),
    ).rejects.toMatchObject({ code: "WORK_ORDER_PLANNED_PAYMENT_VALIDATION_FAILED", status: 400 })
    expect(applyWorkOrderPlannedPaymentsDiffMock).not.toHaveBeenCalled()
  })

  it("maps a P2003 FK violation from the diff writer to LINK_INVALID", async () => {
    applyWorkOrderPlannedPaymentsDiffMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("FK", { code: "P2003" }),
    )
    await expect(
      saveWorkOrderPlannedPaymentsSectionUseCase(
        {
          workOrderId: "wo-1",
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
      code: "WORK_ORDER_PLANNED_PAYMENT_LINK_INVALID",
      status: 400,
      field: "entityId",
    })
  })

  it("attributes a P2003 to paymentPurposeId when the failing FK names it", async () => {
    applyWorkOrderPlannedPaymentsDiffMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("FK", {
        code: "P2003",
        // Prisma 7's real P2003 shape: meta.constraint is an object naming the
        // failing FK's column(s). (Legacy `field_name` no longer exists.)
        meta: { constraint: { fields: ["paymentPurposeId"] } },
      }),
    )
    await expect(
      saveWorkOrderPlannedPaymentsSectionUseCase(
        {
          workOrderId: "wo-1",
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
      code: "WORK_ORDER_PLANNED_PAYMENT_LINK_INVALID",
      status: 400,
      field: "paymentPurposeId",
    })
  })
})
