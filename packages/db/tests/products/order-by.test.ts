import { describe, expect, it } from "vitest"
import {
  buildProductListViewOrderBy,
  productFieldOrderBy,
} from "../../src/products/order-by.js"

/** The fields the products Sort menu exposes, with the Prisma clause each must
 * produce. Menu option keys equal the backend field (no map). */
const FIELD_CLAUSE: Record<string, Record<string, unknown>> = {
  category: { category: { name: "asc" } },
  style: { style: { sort: "asc", nulls: "last" } },
  color: { color: { sort: "asc", nulls: "last" } },
  createdAt: { createdAt: "asc" },
  updatedAt: { updatedAt: "asc" },
}

/** The uniform invisible base order applied when there is no user sort. */
const BASE_ORDER_BY = [{ createdAt: "desc" }, { id: "desc" }]

/** The familiar category grouping a user gets by applying `category:asc` — the
 * builder still expands that lone entry into `category.name → name → id`. */
const CATEGORY_GROUPED_ORDER_BY = [
  { category: { name: "asc" } },
  { name: "asc" },
  { id: "asc" },
]

const lastKey = (orderBy: Array<Record<string, unknown>>) =>
  Object.keys(orderBy[orderBy.length - 1])

describe("buildProductListViewOrderBy", () => {
  it("maps every exposed field to the correct Prisma clause as the leading sort", () => {
    for (const [field, clause] of Object.entries(FIELD_CLAUSE)) {
      const orderBy = buildProductListViewOrderBy({ entries: [{ field, direction: "asc" }] })
      expect(orderBy[0], `leading clause for ${field}`).toEqual(clause)
    }
  })

  it("orders the nullable style/color columns with nulls last", () => {
    expect(productFieldOrderBy("style", "desc")).toEqual({
      style: { sort: "desc", nulls: "last" },
    })
    expect(productFieldOrderBy("color", "desc")).toEqual({
      color: { sort: "desc", nulls: "last" },
    })
  })

  it("resolves category to the related category name", () => {
    expect(productFieldOrderBy("category", "desc")).toEqual({ category: { name: "desc" } })
  })

  it("falls back to the uniform base order with no entries", () => {
    expect(buildProductListViewOrderBy({ entries: [] })).toEqual(BASE_ORDER_BY)
  })

  it("treats undefined sort the same as an empty chain (base order)", () => {
    expect(buildProductListViewOrderBy(undefined)).toEqual(BASE_ORDER_BY)
  })

  it("expands a user-applied lone category:asc into the category grouping", () => {
    // Category grouping is no longer the default — it is a user-applied sort. The
    // builder still expands that lone entry into `category.name → name → id`.
    expect(
      buildProductListViewOrderBy({ entries: [{ field: "category", direction: "asc" }] }),
    ).toEqual(CATEGORY_GROUPED_ORDER_BY)
  })

  it("always ends with `id`, preceded by the `name` secondary key", () => {
    const shapes: Array<{ field: string; direction: "asc" | "desc" }[]> = [
      [{ field: "category", direction: "asc" }],
      [{ field: "createdAt", direction: "desc" }],
      [{ field: "updatedAt", direction: "asc" }],
      [
        { field: "category", direction: "asc" },
        { field: "style", direction: "desc" },
        { field: "createdAt", direction: "asc" },
      ],
    ]
    for (const entries of shapes) {
      const orderBy = buildProductListViewOrderBy({ entries }) as Array<Record<string, unknown>>
      expect(lastKey(orderBy), JSON.stringify(entries)).toEqual(["id"])
      expect(Object.keys(orderBy[orderBy.length - 2]), JSON.stringify(entries)).toEqual(["name"])
    }
  })

  it("appends name + id tiebreaks in the highest-priority column's direction", () => {
    const orderBy = buildProductListViewOrderBy({
      entries: [{ field: "createdAt", direction: "desc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([{ createdAt: "desc" }, { name: "desc" }, { id: "desc" }])
  })

  it("composes an ordered multi-column chain (highest priority first)", () => {
    const orderBy = buildProductListViewOrderBy({
      entries: [
        { field: "style", direction: "asc" },
        { field: "color", direction: "desc" },
      ],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([
      { style: { sort: "asc", nulls: "last" } },
      { color: { sort: "desc", nulls: "last" } },
      { name: "asc" }, // canonical secondary, mirrors the lead column (asc)
      { id: "asc" }, // final tiebreak
    ])
  })

  it("falls back to the uniform base order when every field is unknown", () => {
    const orderBy = buildProductListViewOrderBy({
      entries: [{ field: "totallyNotAColumn", direction: "asc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }])
  })

  it("collapses an identical duplicate clause (field-level dedup is the parser's job)", () => {
    const orderBy = buildProductListViewOrderBy({
      entries: [
        { field: "category", direction: "asc" },
        { field: "category", direction: "asc" },
      ],
    }) as Array<Record<string, unknown>>
    const categoryClauses = orderBy.filter((clause) => "category" in clause)
    expect(categoryClauses).toEqual([{ category: { name: "asc" } }])
  })
})
