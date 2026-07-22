import { describe, expect, it } from "vitest"
import {
  validateTemplateProductsSectionInput,
  validateTemplateServiceItemsDiffInput,
} from "@/app/api/templates/_validators"

// Covers the service / misc item form at the API edge: NO required fields
// (itemType/itemName free-text + bounded), bidCost is a MANUAL money column,
// money fields validate + canonicalize, quantity is optional ("" = unset).
function diffWith(form: Record<string, unknown>) {
  return {
    added: [
      {
        tempId: "t1",
        form: {
          itemType: "Labor",
          itemName: "Install",
          quantity: "2",
          unitId: "",
          bidCost: "10",
          tax: "",
          ...form,
        },
      },
    ],
    modified: [],
    deleted: [],
  }
}

describe("validateTemplateServiceItemsDiffInput — service item form", () => {
  it("accepts a well-formed row and canonicalizes money to scale-2", () => {
    const diff = validateTemplateServiceItemsDiffInput(diffWith({ bidCost: "10.5", tax: "2" }))
    expect(diff.added[0].form).toMatchObject({
      itemType: "Labor",
      itemName: "Install",
      bidCost: "10.50",
      tax: "2.00",
    })
  })

  it("requires nothing — an all-blank row is valid", () => {
    const diff = validateTemplateServiceItemsDiffInput(
      diffWith({ itemType: "", itemName: "", quantity: "", bidCost: "", tax: "" }),
    )
    expect(diff.added[0].form).toMatchObject({ itemType: "", itemName: "", bidCost: "" })
  })

  it("treats a blank quantity as unset ('')", () => {
    expect(validateTemplateServiceItemsDiffInput(diffWith({ quantity: "" })).added[0].form.quantity).toBe("")
  })

  it("rejects a malformed money amount (bidCost)", () => {
    expect(() => validateTemplateServiceItemsDiffInput(diffWith({ bidCost: "abc" }))).toThrow()
  })

  it("rejects an itemName over the length cap", () => {
    expect(() => validateTemplateServiceItemsDiffInput(diffWith({ itemName: "x".repeat(81) }))).toThrow()
  })

  it("rejects an itemType over the length cap", () => {
    expect(() => validateTemplateServiceItemsDiffInput(diffWith({ itemType: "x".repeat(41) }))).toThrow()
  })

  it("reports the service-item error code on a malformed (non-array) added bucket", () => {
    expect(() =>
      validateTemplateServiceItemsDiffInput({ added: "nope", modified: [], deleted: [] } as never),
    ).toThrowError(
      expect.objectContaining({ code: "TEMPLATE_SERVICE_ITEM_VALIDATION_FAILED" }),
    )
  })
})

describe("validateTemplateProductsSectionInput — combined envelope", () => {
  it("parses both named diffs together", () => {
    const parsed = validateTemplateProductsSectionInput({
      plannedProducts: {
        added: [{ tempId: "p1", form: { productId: "prod-1", unitId: "", quantity: "5", notes: "" } }],
        modified: [],
        deleted: [],
      },
      serviceItems: diffWith({}),
    })
    expect(parsed.plannedProducts.added[0].form.productId).toBe("prod-1")
    expect(parsed.serviceItems.added[0].form.itemType).toBe("Labor")
  })

  it("throws when a named diff is missing", () => {
    expect(() => validateTemplateProductsSectionInput({ serviceItems: diffWith({}) })).toThrow()
  })
})
