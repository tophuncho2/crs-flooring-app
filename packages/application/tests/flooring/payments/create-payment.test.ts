import { beforeEach, describe, expect, it, vi } from "vitest"

const { withDatabaseTransactionMock, createPaymentRecordMock } = vi.hoisted(() => ({
  withDatabaseTransactionMock: vi.fn(),
  createPaymentRecordMock: vi.fn(),
}))

vi.mock("@builders/db", () => ({
  Prisma: { PrismaClientKnownRequestError: class extends Error {} },
  withDatabaseTransaction: withDatabaseTransactionMock,
  createPaymentRecord: createPaymentRecordMock,
}))

import { createPaymentUseCase } from "../../../src/flooring/payments/create-payment.js"
import { PaymentExecutionError } from "../../../src/flooring/payments/errors.js"

const ACTOR = "user@x.com"

beforeEach(() => {
  withDatabaseTransactionMock.mockReset()
  createPaymentRecordMock.mockReset()

  withDatabaseTransactionMock.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}))
  createPaymentRecordMock.mockResolvedValue({ id: "pay-1", createdBy: ACTOR, updatedBy: ACTOR })
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

  it("returns the created record on success", async () => {
    const created = { id: "pay-9", createdBy: ACTOR, updatedBy: ACTOR }
    createPaymentRecordMock.mockResolvedValue(created)
    expect(await createPaymentUseCase({ amount: "10.00", direction: "REVENUE" } as never, ACTOR)).toBe(
      created,
    )
  })

  it("stamps the actor email as createdBy and updatedBy on insert", async () => {
    await createPaymentUseCase({ amount: "10.00", direction: "REVENUE" } as never, ACTOR)
    expect(createPaymentRecordMock).toHaveBeenCalledWith(
      { amount: "10.00", direction: "REVENUE", createdBy: ACTOR, updatedBy: ACTOR },
      expect.anything(),
    )
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
