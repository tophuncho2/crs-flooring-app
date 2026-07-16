import { describe, expect, it } from "vitest"
import { validateTemplatePlannedProductsDiffInput } from "@/app/api/templates/_validators"

// Covers the planned-product form at the API edge: productId is required, unit +
// quantity + notes are optional. Margin/subtotal were removed (job costing
// deferred), so the row carries no pricing input the wire must validate.
function diffWith(form: Record<string, unknown>) {
  return {
    added: [{ tempId: "t1", form: { productId: "prod-1", unitId: "", quantity: "5", notes: "", ...form } }],
    modified: [],
    deleted: [],
  }
}

describe("validateTemplatePlannedProductsDiffInput — planned product form", () => {
  it("accepts a well-formed row and passes the fields through", () => {
    const diff = validateTemplatePlannedProductsDiffInput(diffWith({ quantity: "5", notes: "rush" }))
    expect(diff.added[0].form).toMatchObject({ productId: "prod-1", quantity: "5", notes: "rush" })
  })

  it("requires a productId", () => {
    expect(() => validateTemplatePlannedProductsDiffInput(diffWith({ productId: "" }))).toThrow()
  })

  it("treats a blank quantity as unset ('')", () => {
    expect(validateTemplatePlannedProductsDiffInput(diffWith({ quantity: "" })).added[0].form.quantity).toBe("")
  })
})
