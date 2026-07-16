import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, updatePaymentRecordMock, getPaymentByIdWithLinksMock, PrismaKnownError } =
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
      updatePaymentRecordMock: vi.fn(),
      getPaymentByIdWithLinksMock: vi.fn(),
      PrismaKnownError,
    }
  })

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  updatePaymentRecord: updatePaymentRecordMock,
  getPaymentByIdWithLinks: getPaymentByIdWithLinksMock,
}))

import { updatePaymentUseCase } from "../../src/payments/update-payment.js"
import { PaymentExecutionError } from "../../src/payments/errors.js"

const ID = "pay-1"
const ACTOR = "user@x.com"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  updatePaymentRecordMock.mockReset()
  getPaymentByIdWithLinksMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  // The lean update returns `{ id }`; the use case enriches with links on the pool.
  updatePaymentRecordMock.mockResolvedValue({ id: ID })
  getPaymentByIdWithLinksMock.mockResolvedValue({ id: ID, updatedBy: ACTOR })
})

describe("updatePaymentUseCase", () => {
  it("rejects a non-positive amount (when provided) with 400 and never updates", async () => {
    await expect(updatePaymentUseCase(ID, { amount: "0" }, ACTOR)).rejects.toMatchObject({
      code: "PAYMENT_VALIDATION_FAILED",
      status: 400,
      field: "amount",
    })
    expect(updatePaymentRecordMock).not.toHaveBeenCalled()
  })

  it("rejects a blank actor email and never updates", async () => {
    await expect(updatePaymentUseCase(ID, { amount: "10.00" }, "   ")).rejects.toThrowError(
      /actorEmail/,
    )
    expect(updatePaymentRecordMock).not.toHaveBeenCalled()
  })

  it("returns the links-enriched pool record on success (not the lean update result)", async () => {
    updatePaymentRecordMock.mockResolvedValue({ id: ID })
    const enriched = { id: ID, entityName: "Acme", updatedBy: ACTOR }
    getPaymentByIdWithLinksMock.mockResolvedValue(enriched)
    expect(await updatePaymentUseCase(ID, { amount: "10.00" }, ACTOR)).toBe(enriched)
    expect(getPaymentByIdWithLinksMock).toHaveBeenCalledWith(ID)
  })

  it("stamps the actor email as updatedBy", async () => {
    await updatePaymentUseCase(ID, { amount: "10.00" }, ACTOR)
    expect(updatePaymentRecordMock).toHaveBeenCalledWith(
      ID,
      { amount: "10.00", updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("passes the palette color straight through (metadata-only, no recompute)", async () => {
    // The color is a non-semantic visual tag: it rides the update input unread,
    // triggers no validation, and reaches the repo unchanged.
    await updatePaymentUseCase(ID, { color: "VIOLET" }, ACTOR)
    expect(updatePaymentRecordMock).toHaveBeenCalledWith(
      ID,
      { color: "VIOLET", updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("passes the payment method straight through to the repo input", async () => {
    await updatePaymentUseCase(ID, { paymentMethod: "ACH" }, ACTOR)
    expect(updatePaymentRecordMock).toHaveBeenCalledWith(
      ID,
      { paymentMethod: "ACH", updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("passes the store phone straight through to the repo input", async () => {
    await updatePaymentUseCase(ID, { storePhone: "5551234567" }, ACTOR)
    expect(updatePaymentRecordMock).toHaveBeenCalledWith(
      ID,
      { storePhone: "5551234567", updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("passes the receipt number straight through to the repo input", async () => {
    await updatePaymentUseCase(ID, { receiptNumber: "RCPT-001" }, ACTOR)
    expect(updatePaymentRecordMock).toHaveBeenCalledWith(
      ID,
      { receiptNumber: "RCPT-001", updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("passes the store address straight through to the repo input", async () => {
    await updatePaymentUseCase(ID, { storeAddress: "123 Main St" }, ACTOR)
    expect(updatePaymentRecordMock).toHaveBeenCalledWith(
      ID,
      { storeAddress: "123 Main St", updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("passes the store number straight through to the repo input", async () => {
    await updatePaymentUseCase(ID, { storeNumber: "STORE-42" }, ACTOR)
    expect(updatePaymentRecordMock).toHaveBeenCalledWith(
      ID,
      { storeNumber: "STORE-42", updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("passes the internal notes straight through to the repo input", async () => {
    await updatePaymentUseCase(ID, { internalNotes: "Awaiting callback" }, ACTOR)
    expect(updatePaymentRecordMock).toHaveBeenCalledWith(
      ID,
      { internalNotes: "Awaiting callback", updatedBy: ACTOR },
      expect.anything(),
    )
  })

  it("maps a P2025 to a 404 not-found", async () => {
    updatePaymentRecordMock.mockRejectedValue(new PrismaKnownError("missing", { code: "P2025" }))
    await expect(updatePaymentUseCase(ID, { amount: "10.00" }, ACTOR)).rejects.toMatchObject({
      code: "PAYMENT_NOT_FOUND",
      status: 404,
    })
  })

  it("maps a P2003 (bad entity/work-order link) to a 400 link error attributed to entityId", async () => {
    updatePaymentRecordMock.mockRejectedValue(new PrismaKnownError("fk", { code: "P2003" }))
    await expect(
      updatePaymentUseCase(ID, { entityId: "missing" }, ACTOR),
    ).rejects.toMatchObject({
      code: "PAYMENT_LINK_INVALID",
      status: 400,
      field: "entityId",
    })
  })

  it("attributes a P2003 to paymentPurposeId when the failing FK names it", async () => {
    updatePaymentRecordMock.mockRejectedValue(
      // Prisma 7's real P2003 shape: meta.constraint is an object naming the
      // failing FK's column(s). (Legacy `field_name` no longer exists.)
      new PrismaKnownError("fk", {
        code: "P2003",
        meta: { constraint: { fields: ["paymentPurposeId"] } },
      }),
    )
    await expect(
      updatePaymentUseCase(ID, { paymentPurposeId: "missing" }, ACTOR),
    ).rejects.toMatchObject({
      code: "PAYMENT_LINK_INVALID",
      status: 400,
      field: "paymentPurposeId",
    })
  })

  it("re-throws unexpected database errors unchanged", async () => {
    updatePaymentRecordMock.mockRejectedValue(new Error("boom"))
    await expect(updatePaymentUseCase(ID, { amount: "10.00" }, ACTOR)).rejects.toThrowError("boom")
    await expect(updatePaymentUseCase(ID, { amount: "10.00" }, ACTOR)).rejects.not.toBeInstanceOf(
      PaymentExecutionError,
    )
  })
})
