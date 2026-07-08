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

const DEFAULT_ORDER_BY = [
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

  it("returns the historical default chain with no entries", () => {
    expect(buildProductListViewOrderBy({ entries: [] })).toEqual(DEFAULT_ORDER_BY)
  })

  it("treats undefined sort the same as an empty chain (default order)", () => {
    expect(buildProductListViewOrderBy(undefined)).toEqual(DEFAULT_ORDER_BY)
  })

  it("expands a lone category:asc into the historical default (SSR/client parity)", () => {
    // The client + SSR both send the default as `[category:asc]`; the builder
    // must reproduce the empty-entries `category.name → name → id` order so the
    // list never reorders between server paint and client fetch.
    expect(
      buildProductListViewOrderBy({ entries: [{ field: "category", direction: "asc" }] }),
    ).toEqual(DEFAULT_ORDER_BY)
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

  it("skips unknown fields but still produces a deterministic name→id order", () => {
    const orderBy = buildProductListViewOrderBy({
      entries: [{ field: "totallyNotAColumn", direction: "asc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([{ name: "asc" }, { id: "asc" }])
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
