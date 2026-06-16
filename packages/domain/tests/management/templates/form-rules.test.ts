import { describe, expect, it } from "vitest"
import { validateTemplateForm } from "../../../src/management/templates/form-rules.js"
import { EMPTY_TEMPLATE_FORM } from "../../../src/management/templates/types.js"

const baseForm = { ...EMPTY_TEMPLATE_FORM, unitType: "2BR" }

describe("validateTemplateForm", () => {
  it("accepts a template with a unit type but no property", () => {
    expect(validateTemplateForm({ ...baseForm, propertyId: "" })).toBe("")
  })

  it("accepts a template with both a property and a unit type", () => {
    expect(validateTemplateForm({ ...baseForm, propertyId: "prop-1" })).toBe("")
  })

  it("still requires a unit type", () => {
    expect(validateTemplateForm({ ...EMPTY_TEMPLATE_FORM, propertyId: "prop-1" })).toBe(
      "Unit type is required",
    )
  })

  it("rejects a whitespace-only unit type", () => {
    expect(validateTemplateForm({ ...baseForm, unitType: "   " })).toBe("Unit type is required")
  })
})
