import { describe, expect, it } from "vitest"
import { validateTemplatePlannedProductsDiffInput } from "@/app/api/templates/_validators"

// Covers the planned-product margin at the API edge (via optionalPercent). The
// data layer normalizes cost/margin through the same domain rule, so a bad margin
// must fail 400 here rather than round-trip oddly.
function diffWith(margin: unknown) {
  return {
    added: [
      { tempId: "t1", form: { productId: "prod-1", unitId: "", quantity: "5", notes: "", estimatedGrossProfitMargin: margin } },
    ],
    modified: [],
    deleted: [],
  }
}

describe("validateTemplatePlannedProductsDiffInput — margin", () => {
  it("canonicalizes a valid margin to fixed scale 2", () => {
    const diff = validateTemplatePlannedProductsDiffInput(diffWith("30"))
    expect(diff.added[0].form.estimatedGrossProfitMargin).toBe("30.00")
  })

  it("treats blank / missing margin as unset ('')", () => {
    expect(validateTemplatePlannedProductsDiffInput(diffWith("")).added[0].form.estimatedGrossProfitMargin).toBe("")
    expect(validateTemplatePlannedProductsDiffInput(diffWith(undefined)).added[0].form.estimatedGrossProfitMargin).toBe("")
  })

  it("rejects a margin at/above 100 or non-numeric", () => {
    expect(() => validateTemplatePlannedProductsDiffInput(diffWith("100"))).toThrow(/below 100/)
    expect(() => validateTemplatePlannedProductsDiffInput(diffWith("abc"))).toThrow(/below 100/)
  })
})
