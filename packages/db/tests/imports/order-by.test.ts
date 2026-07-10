import { describe, expect, it } from "vitest"
import {
  buildImportsOrderBy,
  importFieldOrderBy,
} from "../../src/imports/order-by.js"

/** The fields the imports Sort menu exposes, with the Prisma clause each must
 * produce. Kept here as the executable spec for the data layer. */
const FIELD_CLAUSE: Record<string, Record<string, unknown>> = {
  createdAt: { createdAt: "asc" },
  updatedAt: { updatedAt: "asc" },
}

const lastKey = (orderBy: Array<Record<string, unknown>>) =>
  Object.keys(orderBy[orderBy.length - 1])

describe("buildImportsOrderBy", () => {
  it("maps every exposed field to the correct Prisma clause as the leading sort", () => {
    for (const [field, clause] of Object.entries(FIELD_CLAUSE)) {
      const orderBy = buildImportsOrderBy({ entries: [{ field, direction: "asc" }] })
      expect(orderBy[0], `leading clause for ${field}`).toEqual(clause)
    }
  })

  it("returns undefined for unknown fields", () => {
    expect(importFieldOrderBy("warehouseName", "asc")).toBeUndefined()
    expect(importFieldOrderBy("importNumber", "desc")).toBeUndefined()
  })

  it("falls back to the uniform base order (createdAt desc, id desc) for an empty chain", () => {
    // importNumber is monotonic with creation, so newest-first is unchanged.
    expect(buildImportsOrderBy({ entries: [] })).toEqual([
      { createdAt: "desc" },
      { id: "desc" },
    ])
  })

  it("treats undefined sort the same as an empty chain", () => {
    expect(buildImportsOrderBy(undefined)).toEqual(buildImportsOrderBy({ entries: [] }))
  })

  it("always ends with `id` as the final tiebreak — every shape", () => {
    const shapes: Array<{ field: string; direction: "asc" | "desc" }[]> = [
      [],
      [{ field: "createdAt", direction: "asc" }],
      [{ field: "updatedAt", direction: "desc" }],
      [
        { field: "createdAt", direction: "asc" },
        { field: "updatedAt", direction: "desc" },
      ],
    ]
    for (const entries of shapes) {
      const orderBy = buildImportsOrderBy({ entries }) as Array<Record<string, unknown>>
      expect(lastKey(orderBy), JSON.stringify(entries)).toEqual(["id"])
    }
  })

  it("appends the importNumber + id tiebreak in the leading direction", () => {
    const orderBy = buildImportsOrderBy({
      entries: [{ field: "createdAt", direction: "desc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([
      { createdAt: "desc" },
      { importNumber: "desc" },
      { id: "desc" },
    ])
  })

  it("keeps a SECONDARY column's own direction; tiebreak mirrors the lead", () => {
    const orderBy = buildImportsOrderBy({
      entries: [
        { field: "createdAt", direction: "asc" },
        { field: "updatedAt", direction: "desc" },
      ],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([
      { createdAt: "asc" },
      { updatedAt: "desc" }, // ← user's own direction, not the lead column's asc
      { importNumber: "asc" }, // tiebreak mirrors the lead column
      { id: "asc" },
    ])
  })

  it("falls back to the uniform base order when every field is unknown", () => {
    const orderBy = buildImportsOrderBy({
      entries: [{ field: "totallyNotAColumn", direction: "asc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }])
  })
})
