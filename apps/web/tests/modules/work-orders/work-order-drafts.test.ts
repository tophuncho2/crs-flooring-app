import { describe, expect, it } from "vitest"
import { EMPTY_WORK_ORDER_FORM } from "@builders/domain"
import { toUpdateWorkOrderInput } from "@/modules/work-orders/controllers/record/drafts"

describe("toUpdateWorkOrderInput", () => {
  it("carries purchaseOrderNumber into the update/create payload", () => {
    const input = toUpdateWorkOrderInput({ ...EMPTY_WORK_ORDER_FORM, purchaseOrderNumber: "PO-4821" })
    expect(input.purchaseOrderNumber).toBe("PO-4821")
  })

  it("passes an empty purchaseOrderNumber through unchanged", () => {
    const input = toUpdateWorkOrderInput(EMPTY_WORK_ORDER_FORM)
    expect(input.purchaseOrderNumber).toBe("")
  })

  it("carries return into the update/create payload", () => {
    const input = toUpdateWorkOrderInput({ ...EMPTY_WORK_ORDER_FORM, return: "RET-77" })
    expect(input.return).toBe("RET-77")
  })

  it("passes an empty return through unchanged", () => {
    const input = toUpdateWorkOrderInput(EMPTY_WORK_ORDER_FORM)
    expect(input.return).toBe("")
  })

  it("carries customerName into the update/create payload", () => {
    const input = toUpdateWorkOrderInput({ ...EMPTY_WORK_ORDER_FORM, customerName: "Jane Doe" })
    expect(input.customerName).toBe("Jane Doe")
  })

  it("passes an empty customerName through unchanged", () => {
    const input = toUpdateWorkOrderInput(EMPTY_WORK_ORDER_FORM)
    expect(input.customerName).toBe("")
  })

  it("carries installer into the update/create payload", () => {
    const input = toUpdateWorkOrderInput({ ...EMPTY_WORK_ORDER_FORM, installer: "Crew A" })
    expect(input.installer).toBe("Crew A")
  })

  it("passes an empty installer through unchanged", () => {
    const input = toUpdateWorkOrderInput(EMPTY_WORK_ORDER_FORM)
    expect(input.installer).toBe("")
  })

  it("maps the WO-owned address, aliasing form `zip` to wire `postalCode`", () => {
    const input = toUpdateWorkOrderInput({
      ...EMPTY_WORK_ORDER_FORM,
      streetAddress: "12 Oak St",
      city: "Austin",
      state: "TX",
      zip: "78701",
    })
    expect(input.streetAddress).toBe("12 Oak St")
    expect(input.city).toBe("Austin")
    expect(input.state).toBe("TX")
    expect(input.postalCode).toBe("78701")
  })
})
