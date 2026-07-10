import { describe, expect, it } from "vitest"
import {
  adjustmentFieldOrderBy,
  buildAdjustmentsListViewOrderBy,
} from "../../../src/inventory/adjustments/order-by.js"

/** The fields the adjustments Sort menu exposes, with the Prisma clause each
 * must produce. Column keys equal the backend field (no map). */
const FIELD_CLAUSE: Record<string, Record<string, unknown>> = {
  productName: { product: { name: "asc" } },
  location: { location: { sort: "asc", nulls: "last" } },
  createdAt: { createdAt: "asc" },
  updatedAt: { updatedAt: "asc" },
}

const lastKey = (orderBy: Array<Record<string, unknown>>) =>
  Object.keys(orderBy[orderBy.length - 1])

describe("buildAdjustmentsListViewOrderBy", () => {
  it("maps every exposed field to the correct Prisma clause as the leading sort", () => {
    for (const [field, clause] of Object.entries(FIELD_CLAUSE)) {
      const orderBy = buildAdjustmentsListViewOrderBy({ entries: [{ field, direction: "asc" }] })
      expect(orderBy[0], `leading clause for ${field}`).toEqual(clause)
    }
  })

  it("orders the nullable location column with nulls last", () => {
    expect(adjustmentFieldOrderBy("location", "desc")).toEqual({
      location: { sort: "desc", nulls: "last" },
    })
  })

  it("sorts productName on the live product.name relation", () => {
    expect(adjustmentFieldOrderBy("productName", "desc")).toEqual({ product: { name: "desc" } })
  })

  it("always ends with `id` (rowid) as the final tiebreak — every shape", () => {
    const shapes: Array<{ field: string; direction: "asc" | "desc" }[]> = [
      [],
      [{ field: "productName", direction: "asc" }],
      [{ field: "createdAt", direction: "desc" }],
      [{ field: "updatedAt", direction: "asc" }],
      [
        { field: "location", direction: "asc" },
        { field: "productName", direction: "desc" },
        { field: "createdAt", direction: "asc" },
      ],
    ]
    for (const entries of shapes) {
      const orderBy = buildAdjustmentsListViewOrderBy({ entries }) as Array<Record<string, unknown>>
      expect(lastKey(orderBy), JSON.stringify(entries)).toEqual(["id"])
    }
  })

  it("defaults the tiebreak to desc (newest first) with no entries", () => {
    const orderBy = buildAdjustmentsListViewOrderBy({ entries: [] }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }])
  })

  it("does NOT double the createdAt clause when the user sorts by it", () => {
    const orderBy = buildAdjustmentsListViewOrderBy({
      entries: [{ field: "createdAt", direction: "asc" }],
    }) as Array<Record<string, unknown>>
    const createdAtClauses = orderBy.filter((clause) => "createdAt" in clause)
    expect(createdAtClauses).toHaveLength(1)
    expect(orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }])
  })

  it("keeps a SECONDARY createdAt's own direction (regression)", () => {
    const orderBy = buildAdjustmentsListViewOrderBy({
      entries: [
        { field: "location", direction: "asc" },
        { field: "createdAt", direction: "desc" },
      ],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([
      { location: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" }, // ← user's own direction
      { id: "asc" }, // tiebreak id mirrors the lead column (asc)
    ])
  })

  it("falls back to the uniform base order when every field is unknown", () => {
    const orderBy = buildAdjustmentsListViewOrderBy({
      entries: [{ field: "totallyNotAColumn", direction: "asc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }])
  })

  it("collapses an identical duplicate clause (field-level dedup is the parser's job)", () => {
    const orderBy = buildAdjustmentsListViewOrderBy({
      entries: [
        { field: "productName", direction: "asc" },
        { field: "productName", direction: "asc" },
      ],
    }) as Array<Record<string, unknown>>
    const productClauses = orderBy.filter((clause) => "product" in clause)
    expect(productClauses).toEqual([{ product: { name: "asc" } }])
  })

  it("treats undefined sort the same as an empty chain", () => {
    expect(buildAdjustmentsListViewOrderBy(undefined)).toEqual(
      buildAdjustmentsListViewOrderBy({ entries: [] }),
    )
  })
})
