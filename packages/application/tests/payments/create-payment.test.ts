import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, createPaymentRecordMock, getPaymentByIdWithLinksMock, PrismaKnownError } =
  vi.hoisted(() => {
    class PrismaKnownError extends Error {
      code: string
      meta?: Record<string, unknown>
      constructor(message: string, opts: { code: string; meta?: Record<string, unknown> }) {
        super(message)
        this.code = opts.code
        this.meta = opts.meta
      }
    }
    return {
      withDatabaseTransactionMock: vi.fn(),
      createPaymentRecordMock: vi.fn(),
      getPaymentByIdWithLinksMock: vi.fn(),
      PrismaKnownError,
    }
  })

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  createPaymentRecord: createPaymentRecordMock,
  getPaymentByIdWithLinks: getPaymentByIdWithLinksMock,
}))

import { createPaymentUseCase } from "../../src/payments/create-payment.js"
import { PaymentExecutionError } from "../../src/payments/errors.js"

const ACTOR = "user@x.com"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  createPaymentRecordMock.mockReset()
  getPaymentByIdWithLinksMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  // The lean insert returns `{ id }`; the use case enriches with links on the pool.
  createPaymentRecordMock.mockResolvedValue({ id: "pay-1" })
  getPaymentByIdWithLinksMock.mockResolvedValue({ id: "pay-1", createdBy: ACTOR, updatedBy: ACTOR })
})

describe("createPaymentUseCase", () => {
  it("rejects an empty amount with 400 and never inserts", async () => {
    await expect(
      createPaymentUseCase({ amount: "", direction: "REVENUE" } as never, ACTOR),
    ).rejects.toMatchObject({
      code: "PAYMENT_VALIDATION_FAILED",
      status: 400,
      field: "amount",
    })
    expect(createPaymentRecordMock).not.toHaveBeenCalled()
  })

  it("rejects a blank actor email and never inserts", async () => {
    await expect(
      createPaymentUseCase({ amount: "10.00", direction: "REVENUE" } as never, "   "),
    ).rejects.toThrowError(/actorEmail/)
    expect(createPaymentRecordMock).not.toHaveBeenCalled()
  })

  it("returns the links-enriched pool record on success (not the lean insert result)", async () => {
    createPaymentRecordMock.mockResolvedValue({ id: "pay-9" })
    const enriched = { id: "pay-9", entityName: "Acme", createdBy: ACTOR, updatedBy: ACTOR }
    getPaymentByIdWithLinksMock.mockResolvedValue(enriched)
    expect(await createPaymentUseCase({ amount: "10.00", direction: "REVENUE" } as never, ACTOR)).toBe(
      enriched,
    )
    // Enriched off the id the lean insert returned.
    expect(getPaymentByIdWithLinksMock).toHaveBeenCalledWith("pay-9")
  })

  it("stamps the actor email as createdBy and updatedBy on insert", async () => {
    await createPaymentUseCase({ amount: "10.00", direction: "REVENUE" } as never, ACTOR)
    expect(createPaymentRecordMock).toHaveBeenCalledWith(
      { amount: "10.00", direction: "REVENUE", createdBy: ACTOR, updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("passes the payment method straight through to the repo input", async () => {
    await createPaymentUseCase(
      { amount: "10.00", direction: "REVENUE", paymentMethod: "Credit Card" } as never,
      ACTOR,
    )
    expect(createPaymentRecordMock).toHaveBeenCalledWith(
      { amount: "10.00", direction: "REVENUE", paymentMethod: "Credit Card", createdBy: ACTOR, updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("passes the store phone straight through to the repo input", async () => {
    await createPaymentUseCase(
      { amount: "10.00", direction: "REVENUE", storePhone: "5551234567" } as never,
      ACTOR,
    )
    expect(createPaymentRecordMock).toHaveBeenCalledWith(
      { amount: "10.00", direction: "REVENUE", storePhone: "5551234567", createdBy: ACTOR, updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("passes the receipt number straight through to the repo input", async () => {
    await createPaymentUseCase(
      { amount: "10.00", direction: "REVENUE", receiptNumber: "RCPT-001" } as never,
      ACTOR,
    )
    expect(createPaymentRecordMock).toHaveBeenCalledWith(
      { amount: "10.00", direction: "REVENUE", receiptNumber: "RCPT-001", createdBy: ACTOR, updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("passes the store address straight through to the repo input", async () => {
    await createPaymentUseCase(
      { amount: "10.00", direction: "REVENUE", storeAddress: "123 Main St" } as never,
      ACTOR,
    )
    expect(createPaymentRecordMock).toHaveBeenCalledWith(
      { amount: "10.00", direction: "REVENUE", storeAddress: "123 Main St", createdBy: ACTOR, updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("passes the store number straight through to the repo input", async () => {
    await createPaymentUseCase(
      { amount: "10.00", direction: "REVENUE", storeNumber: "STORE-42" } as never,
      ACTOR,
    )
    expect(createPaymentRecordMock).toHaveBeenCalledWith(
      { amount: "10.00", direction: "REVENUE", storeNumber: "STORE-42", createdBy: ACTOR, updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("passes the internal notes straight through to the repo input", async () => {
    await createPaymentUseCase(
      { amount: "10.00", direction: "REVENUE", internalNotes: "Awaiting callback" } as never,
      ACTOR,
    )
    expect(createPaymentRecordMock).toHaveBeenCalledWith(
      { amount: "10.00", direction: "REVENUE", internalNotes: "Awaiting callback", createdBy: ACTOR, updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("maps a P2003 (bad entity/work-order link) to a 400 link error attributed to entityId", async () => {
    createPaymentRecordMock.mockRejectedValue(new PrismaKnownError("fk", { code: "P2003" }))
    await expect(
      createPaymentUseCase(
        { amount: "10.00", direction: "REVENUE", entityId: "missing" } as never,
        ACTOR,
      ),
    ).rejects.toMatchObject({
      code: "PAYMENT_LINK_INVALID",
      status: 400,
      field: "entityId",
    })
  })

  it("attributes a P2003 to paymentPurposeId when the failing FK names it", async () => {
    createPaymentRecordMock.mockRejectedValue(
      // Prisma 7's real P2003 shape: meta.constraint is an object naming the
      // failing FK's column(s). (Legacy `field_name` no longer exists.)
      new PrismaKnownError("fk", {
        code: "P2003",
        meta: { constraint: { fields: ["paymentPurposeId"] } },
      }),
    )
    await expect(
      createPaymentUseCase(
        { amount: "10.00", direction: "REVENUE", paymentPurposeId: "missing" } as never,
        ACTOR,
      ),
    ).rejects.toMatchObject({
      code: "PAYMENT_LINK_INVALID",
      status: 400,
      field: "paymentPurposeId",
    })
  })

  it("re-throws unexpected database errors unchanged", async () => {
    createPaymentRecordMock.mockRejectedValue(new Error("boom"))
    await expect(
      createPaymentUseCase({ amount: "10.00", direction: "REVENUE" } as never, ACTOR),
    ).rejects.toThrowError("boom")
    await expect(
      createPaymentUseCase({ amount: "10.00", direction: "REVENUE" } as never, ACTOR),
    ).rejects.not.toBeInstanceOf(PaymentExecutionError)
  })
})
