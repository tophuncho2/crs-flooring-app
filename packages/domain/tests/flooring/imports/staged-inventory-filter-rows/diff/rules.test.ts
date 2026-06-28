import { describe, expect, it } from "vitest"
import { validateStagedInventoryFiltersDiff } from "../../../../../src/flooring/imports/staged-inventory-filter-rows/diff/rules.js"
import type {
  DiffExistingStagedInventoryFilterRow,
  StagedInventoryFiltersDiff,
} from "../../../../../src/flooring/imports/staged-inventory-filter-rows/diff/types.js"

function filterForm(overrides: Partial<{ productId: string; categoryFilterId: string | null; stockOrdered: string }> = {}) {
  return {
    productId: "product-1",
    categoryFilterId: "cat-1",
    stockOrdered: "10",
    ...overrides,
  }
}

function existingFilter(
  overrides: Partial<DiffExistingStagedInventoryFilterRow> = {},
): DiffExistingStagedInventoryFilterRow {
  return {
    id: "filter-1",
    productId: "product-1",
    categoryFilterId: "cat-1",
    ...overrides,
  }
}

function emptyDiff(): StagedInventoryFiltersDiff {
  return { added: [], modified: [], deleted: [] }
}

describe("validateStagedInventoryFiltersDiff", () => {
  describe("duplicate products are allowed", () => {
    it("does NOT flag two added rows referencing the same product", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        added: [
          { tempId: "t1", form: filterForm({ productId: "product-a" }) },
          { tempId: "t2", form: filterForm({ productId: "product-a" }) },
        ],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [],
        knownProductIds: ["product-a"],
      })
      expect(issues).toEqual([])
    })

    it("does NOT flag an added row sharing an existing row's product", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        added: [{ tempId: "t1", form: filterForm({ productId: "product-1" }) }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [existingFilter()],
        knownProductIds: ["product-1"],
      })
      expect(issues).toEqual([])
    })
  })

  describe("FILTER_UNKNOWN_PRODUCT", () => {
    it("flags an added row whose product isn't in the batch-fetched set", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        added: [{ tempId: "t1", form: filterForm({ productId: "ghost" }) }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [],
        knownProductIds: [],
      })
      expect(issues).toEqual([
        {
          code: "FILTER_UNKNOWN_PRODUCT",
          productId: "ghost",
          rowId: null,
          rowTempId: "t1",
        },
      ])
    })

    it("flags a modified row whose new product isn't in the batch-fetched set", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        modified: [{ id: "filter-1", form: filterForm({ productId: "ghost" }) }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [existingFilter()],
        knownProductIds: [],
      })
      expect(issues.some((i) => i.code === "FILTER_UNKNOWN_PRODUCT")).toBe(true)
    })

    it("does NOT flag existing rows (their product is assumed valid)", () => {
      const issues = validateStagedInventoryFiltersDiff(emptyDiff(), {
        existing: [existingFilter({ productId: "unknown-product" })],
        knownProductIds: [],
      })
      expect(issues.some((i) => i.code === "FILTER_UNKNOWN_PRODUCT")).toBe(false)
    })
  })

  describe("FILTER_CATEGORY_FILTER_LOCKED_AFTER_CREATE", () => {
    it("blocks categoryFilterId change on a modified row (no carve-out)", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        modified: [
          { id: "filter-1", form: filterForm({ categoryFilterId: "cat-different" }) },
        ],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [existingFilter()],
        knownProductIds: ["product-1"],
      })
      expect(issues).toEqual([
        { code: "FILTER_CATEGORY_FILTER_LOCKED_AFTER_CREATE", rowId: "filter-1" },
      ])
    })
  })

  describe("happy path + multiple issues", () => {
    it("returns empty array for a clean diff", () => {
      const issues = validateStagedInventoryFiltersDiff(emptyDiff(), {
        existing: [],
        knownProductIds: [],
      })
      expect(issues).toEqual([])
    })

    it("returns all violations in a single pass", () => {
      const diff: StagedInventoryFiltersDiff = {
        added: [{ tempId: "t1", form: filterForm({ productId: "ghost" }) }],
        modified: [
          { id: "filter-1", form: filterForm({ productId: "product-2", categoryFilterId: "cat-other" }) },
        ],
        deleted: [{ id: "filter-2" }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [
          existingFilter({ id: "filter-1", productId: "product-1" }),
          existingFilter({ id: "filter-2", productId: "product-deleted" }),
        ],
        knownProductIds: ["product-2"],
      })
      const codes = new Set(issues.map((i) => i.code))
      expect(codes.has("FILTER_UNKNOWN_PRODUCT")).toBe(true)
      expect(codes.has("FILTER_CATEGORY_FILTER_LOCKED_AFTER_CREATE")).toBe(true)
    })
  })
})
