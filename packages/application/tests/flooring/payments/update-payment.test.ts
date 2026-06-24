import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, updatePaymentRecordMock, PrismaKnownError } = vi.hoisted(() => {
  class PrismaKnownError extends Error {
    code: string
    constructor(message: string, opts: { code: string }) {
      super(message)
      this.code = opts.code
    }
  }
  return {
    withDatabaseTransactionMock: vi.fn(),
    updatePaymentRecordMock: vi.fn(),
    PrismaKnownError,
  }
})

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  withDatabaseTransaction: withDatabaseTransactionMock,
  updatePaymentRecord: updatePaymentRecordMock,
}))

import { updatePaymentUseCase } from "../../../src/flooring/payments/update-payment.js"
import { PaymentExecutionError } from "../../../src/flooring/payments/errors.js"

const ID = "pay-1"
const ACTOR = "user@x.com"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  updatePaymentRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  updatePaymentRecordMock.mockResolvedValue({ id: ID, updatedBy: ACTOR })
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

  it("returns the updated record on success", async () => {
    const updated = { id: ID, updatedBy: ACTOR }
    updatePaymentRecordMock.mockResolvedValue(updated)
    expect(await updatePaymentUseCase(ID, { amount: "10.00" }, ACTOR)).toBe(updated)
  })

  it("stamps the actor email as updatedBy", async () => {
    await updatePaymentUseCase(ID, { amount: "10.00" }, ACTOR)
    expect(updatePaymentRecordMock).toHaveBeenCalledWith(
      ID,
      { amount: "10.00", updatedBy: ACTOR },
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

  it("maps a P2003 (bad entity/work-order link) to a 400 link error", async () => {
    updatePaymentRecordMock.mockRejectedValue(new PrismaKnownError("fk", { code: "P2003" }))
    await expect(
      updatePaymentUseCase(ID, { entityId: "missing" }, ACTOR),
    ).rejects.toMatchObject({
      code: "PAYMENT_LINK_INVALID",
      status: 400,
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
