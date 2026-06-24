import { describe, expect, it } from "vitest"
import { normalizePayment } from "../../../src/flooring/payments/normalizers.js"

describe("normalizePayment", () => {
  it("converts Date timestamps to ISO strings and passes actor emails through", () => {
    expect(
      normalizePayment({
        id: "pay-1",
        paymentNumber: "PAY-1",
        paymentNumberInt: 1,
        amount: "10.00",
        direction: "REVENUE",
        paymentDate: new Date("2026-05-26T01:02:03.000Z"),
        createdAt: new Date("2026-05-26T01:02:03.000Z"),
        updatedAt: new Date("2026-05-27T04:05:06.000Z"),
        createdBy: "creator@x.com",
        updatedBy: "editor@x.com",
      }),
    ).toEqual({
      id: "pay-1",
      paymentNumber: "PAY-1",
      paymentNumberInt: 1,
      amount: "10.00",
      direction: "REVENUE",
      paymentDate: "2026-05-26T01:02:03.000Z",
      entityId: null,
      workOrderId: null,
      entityName: null,
      workOrderNumber: null,
      workOrderLabel: null,
      entityTypes: [],
      createdAt: "2026-05-26T01:02:03.000Z",
      updatedAt: "2026-05-27T04:05:06.000Z",
      createdBy: "creator@x.com",
      updatedBy: "editor@x.com",
    })
  })

  it("passes through string timestamps and null actor emails unchanged", () => {
    expect(
      normalizePayment({
        id: "pay-2",
        paymentNumber: "PAY-2",
        paymentNumberInt: null,
        amount: "5.00",
        direction: "EXPENSE",
        paymentDate: null,
        createdAt: "2026-05-26T00:00:00.000Z",
        updatedAt: "2026-05-26T00:00:00.000Z",
        createdBy: null,
        updatedBy: null,
      }),
    ).toEqual({
      id: "pay-2",
      paymentNumber: "PAY-2",
      paymentNumberInt: undefined,
      amount: "5.00",
      direction: "EXPENSE",
      paymentDate: "",
      entityId: null,
      workOrderId: null,
      entityName: null,
      workOrderNumber: null,
      workOrderLabel: null,
      entityTypes: [],
      createdAt: "2026-05-26T00:00:00.000Z",
      updatedAt: "2026-05-26T00:00:00.000Z",
      createdBy: null,
      updatedBy: null,
    })
  })
})
