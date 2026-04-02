import { describe, expect, it } from "vitest"
import { validateCategoryForm, type CategoryForm } from "@/modules/categories/domain/types"

describe("validateCategoryForm", () => {
  const validForm: CategoryForm = {
    name: "Carpet",
    sendUnitId: "unit-1",
    stockUnitId: "unit-2",
    coverageAvailableUnitId: "unit-3",
    itemCoverageUnitId: "unit-4",
    serviceUnitId: "unit-5",
  }

  it("accepts a valid form with all fields populated", () => {
    expect(validateCategoryForm(validForm)).toBe("")
  })

  it("accepts a form with empty optional unit IDs", () => {
    const form: CategoryForm = {
      name: "Vinyl",
      sendUnitId: "",
      stockUnitId: "",
      coverageAvailableUnitId: "",
      itemCoverageUnitId: "",
      serviceUnitId: "",
    }
    expect(validateCategoryForm(form)).toBe("")
  })

  it("rejects an empty name", () => {
    const form: CategoryForm = { ...validForm, name: "" }
    expect(validateCategoryForm(form)).toBe("Category name is required")
  })

  it("rejects a whitespace-only name", () => {
    const form: CategoryForm = { ...validForm, name: "   " }
    expect(validateCategoryForm(form)).toBe("Category name is required")
  })

  it("accepts a name with leading/trailing whitespace around content", () => {
    const form: CategoryForm = { ...validForm, name: "  Tile  " }
    expect(validateCategoryForm(form)).toBe("")
  })
})
