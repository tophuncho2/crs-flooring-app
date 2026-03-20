import { describe, expect, it } from "vitest"
import { validateCategoryForm } from "@/features/flooring/categories/validators"

describe("validateCategoryForm", () => {
  it("requires category name", () => {
    expect(validateCategoryForm({ name: "" })).toBe("Category name is required")
  })

  it("enforces client-side uniqueness across other categories", () => {
    expect(
      validateCategoryForm(
        { name: "Carpet" },
        [
          { id: "cat-1", name: "Carpet" },
          { id: "cat-2", name: "Tile" },
        ],
      ),
    ).toBe("Category name must be unique")

    expect(
      validateCategoryForm(
        { name: "Carpet" },
        [{ id: "cat-1", name: "Carpet" }],
        "cat-1",
      ),
    ).toBe("")
  })
})
