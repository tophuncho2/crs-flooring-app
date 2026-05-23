import { describe, expect, it } from "vitest"
import { validateStagedInventoryFiltersDiff } from "../../../../../src/flooring/imports/staged-inventory-filter-rows/diff/rules.js"
import type {
  DiffExistingStagedInventoryFilterRow,
  StagedInventoryFiltersDiff,
} from "../../../../../src/flooring/imports/staged-inventory-filter-rows/diff/types.js"
import type {
  DiffExistingStagedInventoryRow,
  StagedInventoryRowsDiff,
} from "../../../../../src/flooring/imports/staged-inventory-rows/diff/types.js"

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
    hasChildren: false,
    ...overrides,
  }
}

function existingChildRow(
  overrides: Partial<DiffExistingStagedInventoryRow> = {},
): DiffExistingStagedInventoryRow {
  return {
    id: "row-1",
    filterRowId: "filter-1",
    status: "DRAFT",
    isImported: false,
    ...overrides,
  }
}

const emptyRowsDiff: StagedInventoryRowsDiff = {
  added: [],
  modified: [],
  deleted: [],
}

function emptyDiff(): StagedInventoryFiltersDiff {
  return { added: [], modified: [], deleted: [] }
}

describe("validateStagedInventoryFiltersDiff", () => {
  describe("FILTER_DUPLICATE_PRODUCT", () => {
    it("flags two added rows referencing the same product", () => {
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
      const dup = issues.filter((i) => i.code === "FILTER_DUPLICATE_PRODUCT")
      expect(dup).toHaveLength(1)
      expect(dup[0]).toMatchObject({
        code: "FILTER_DUPLICATE_PRODUCT",
        productId: "product-a",
        rowTempId: "t2",
      })
    })

    it("flags an added row colliding with an existing row's product", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        added: [{ tempId: "t1", form: filterForm({ productId: "product-1" }) }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [existingFilter()],
        knownProductIds: ["product-1"],
      })
      expect(issues.some((i) => i.code === "FILTER_DUPLICATE_PRODUCT")).toBe(true)
    })

    it("does NOT flag a duplicate when the existing row is being deleted in the same save", () => {
      const diff: StagedInventoryFiltersDiff = {
        added: [{ tempId: "t1", form: filterForm({ productId: "product-1" }) }],
        modified: [],
        deleted: [{ id: "filter-1" }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [existingFilter()],
        knownProductIds: ["product-1"],
      })
      expect(issues.some((i) => i.code === "FILTER_DUPLICATE_PRODUCT")).toBe(false)
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

  describe("FILTER_PRODUCT_LOCKED_WITH_CHILDREN", () => {
    it("blocks productId change on a modified row that has children remaining", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        modified: [{ id: "filter-1", form: filterForm({ productId: "product-2" }) }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [existingFilter({ hasChildren: true })],
        knownProductIds: ["product-2"],
        stagedRows: {
          diff: emptyRowsDiff,
          existing: [existingChildRow()],
        },
      })
      expect(issues.some((i) => i.code === "FILTER_PRODUCT_LOCKED_WITH_CHILDREN")).toBe(true)
    })

    it("ALLOWS productId change when every child is being deleted in the same save (carve-out)", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        modified: [{ id: "filter-1", form: filterForm({ productId: "product-2" }) }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [existingFilter({ hasChildren: true })],
        knownProductIds: ["product-2"],
        stagedRows: {
          diff: { added: [], modified: [], deleted: [{ id: "row-1" }] },
          existing: [existingChildRow()],
        },
      })
      expect(issues.some((i) => i.code === "FILTER_PRODUCT_LOCKED_WITH_CHILDREN")).toBe(false)
    })

    it("does NOT flag a productId that hasn't actually changed", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        modified: [{ id: "filter-1", form: filterForm({ productId: "product-1" }) }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [existingFilter({ hasChildren: true })],
        knownProductIds: ["product-1"],
        stagedRows: {
          diff: emptyRowsDiff,
          existing: [existingChildRow()],
        },
      })
      expect(issues.some((i) => i.code === "FILTER_PRODUCT_LOCKED_WITH_CHILDREN")).toBe(false)
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

    it("still blocks category change even when filter has no children", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        modified: [
          { id: "filter-1", form: filterForm({ categoryFilterId: "cat-different" }) },
        ],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [existingFilter({ hasChildren: false })],
        knownProductIds: ["product-1"],
      })
      expect(issues.some((i) => i.code === "FILTER_CATEGORY_FILTER_LOCKED_AFTER_CREATE")).toBe(true)
    })
  })

  describe("FILTER_DELETE_BLOCKED_BY_CHILDREN", () => {
    it("blocks delete when post-diff child count is > 0", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        deleted: [{ id: "filter-1" }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [existingFilter({ hasChildren: true })],
        knownProductIds: ["product-1"],
        stagedRows: {
          diff: emptyRowsDiff,
          existing: [existingChildRow()],
        },
      })
      expect(issues).toEqual([
        { code: "FILTER_DELETE_BLOCKED_BY_CHILDREN", rowId: "filter-1" },
      ])
    })

    it("ALLOWS delete when all children are also being deleted in same save", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        deleted: [{ id: "filter-1" }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [existingFilter({ hasChildren: true })],
        knownProductIds: ["product-1"],
        stagedRows: {
          diff: { added: [], modified: [], deleted: [{ id: "row-1" }] },
          existing: [existingChildRow()],
        },
      })
      expect(issues.some((i) => i.code === "FILTER_DELETE_BLOCKED_BY_CHILDREN")).toBe(false)
    })

    it("ALLOWS delete of childless filter row", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        deleted: [{ id: "filter-1" }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [existingFilter({ hasChildren: false })],
        knownProductIds: ["product-1"],
      })
      expect(issues.some((i) => i.code === "FILTER_DELETE_BLOCKED_BY_CHILDREN")).toBe(false)
    })

    it("falls back to existing-only when stagedRows context is omitted (callers without cross-slice context)", () => {
      const diff: StagedInventoryFiltersDiff = {
        ...emptyDiff(),
        deleted: [{ id: "filter-1" }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [existingFilter({ hasChildren: true })],
        knownProductIds: ["product-1"],
      })
      expect(issues.some((i) => i.code === "FILTER_DELETE_BLOCKED_BY_CHILDREN")).toBe(false)
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
        added: [
          { tempId: "t1", form: filterForm({ productId: "ghost" }) },
          { tempId: "t2", form: filterForm({ productId: "ghost" }) },
        ],
        modified: [
          { id: "filter-1", form: filterForm({ productId: "product-2", categoryFilterId: "cat-other" }) },
        ],
        deleted: [{ id: "filter-2" }],
      }
      const issues = validateStagedInventoryFiltersDiff(diff, {
        existing: [
          existingFilter({ id: "filter-1", productId: "product-1", hasChildren: true }),
          existingFilter({ id: "filter-2", productId: "product-deleted", hasChildren: true }),
        ],
        knownProductIds: ["product-2"],
        stagedRows: {
          diff: emptyRowsDiff,
          existing: [
            existingChildRow({ id: "row-a", filterRowId: "filter-1" }),
            existingChildRow({ id: "row-b", filterRowId: "filter-2" }),
          ],
        },
      })
      const codes = new Set(issues.map((i) => i.code))
      expect(codes.has("FILTER_DUPLICATE_PRODUCT")).toBe(true)
      expect(codes.has("FILTER_UNKNOWN_PRODUCT")).toBe(true)
      expect(codes.has("FILTER_PRODUCT_LOCKED_WITH_CHILDREN")).toBe(true)
      expect(codes.has("FILTER_CATEGORY_FILTER_LOCKED_AFTER_CREATE")).toBe(true)
      expect(codes.has("FILTER_DELETE_BLOCKED_BY_CHILDREN")).toBe(true)
    })
  })
})
