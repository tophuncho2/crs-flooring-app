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
})
