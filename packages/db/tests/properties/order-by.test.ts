import { describe, expect, it } from "vitest"
import {
  buildPropertiesOrderBy,
  propertyFieldOrderBy,
} from "../../src/properties/order-by.js"

/** The fields the properties Sort menu exposes, with the Prisma clause each must
 * produce. Kept here as the executable spec for the data layer. */
const FIELD_CLAUSE: Record<string, Record<string, unknown>> = {
  name: { name: "asc" },
  entity: { entity: { entity: "asc" } },
  createdAt: { createdAt: "asc" },
  updatedAt: { updatedAt: "asc" },
}

const lastKey = (orderBy: Array<Record<string, unknown>>) =>
  Object.keys(orderBy[orderBy.length - 1])

describe("buildPropertiesOrderBy", () => {
  it("maps every exposed field to the correct Prisma clause as the leading sort", () => {
    for (const [field, clause] of Object.entries(FIELD_CLAUSE)) {
      const orderBy = buildPropertiesOrderBy({ entries: [{ field, direction: "asc" }] })
      expect(orderBy[0], `leading clause for ${field}`).toEqual(clause)
    }
  })

  it("resolves the entity relation through entity.entity", () => {
    expect(propertyFieldOrderBy("entity", "desc")).toEqual({
      entity: { entity: "desc" },
    })
  })

  it("always ends with `id` as the final tiebreak — every shape", () => {
    const shapes: Array<{ field: string; direction: "asc" | "desc" }[]> = [
      [],
      [{ field: "name", direction: "asc" }],
      [{ field: "createdAt", direction: "asc" }],
      [{ field: "updatedAt", direction: "desc" }],
      [
        { field: "name", direction: "asc" },
        { field: "entity", direction: "desc" },
        { field: "createdAt", direction: "asc" },
      ],
    ]
    for (const entries of shapes) {
      const orderBy = buildPropertiesOrderBy({ entries }) as Array<Record<string, unknown>>
      expect(lastKey(orderBy), JSON.stringify(entries)).toEqual(["id"])
    }
  })

  it("appends the createdAt tiebreak when the user did not select it", () => {
    const orderBy = buildPropertiesOrderBy({
      entries: [{ field: "name", direction: "asc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([
      { name: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ])
  })

  it("does NOT double the createdAt clause when the user sorts by it", () => {
    const orderBy = buildPropertiesOrderBy({
      entries: [{ field: "createdAt", direction: "desc" }],
    }) as Array<Record<string, unknown>>
    const createdAtClauses = orderBy.filter((clause) => "createdAt" in clause)
    expect(createdAtClauses).toHaveLength(1)
    expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }])
  })

  it("keeps a SECONDARY createdAt's own direction", () => {
    const orderBy = buildPropertiesOrderBy({
      entries: [
        { field: "name", direction: "desc" },
        { field: "createdAt", direction: "asc" },
      ],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([
      { name: "desc" },
      { createdAt: "asc" }, // ← user's own direction, not the lead column's desc
      { id: "desc" }, // tiebreak id mirrors the lead column
    ])
  })

  it("falls back to the uniform base order when every field is unknown", () => {
    const orderBy = buildPropertiesOrderBy({
      entries: [{ field: "totallyNotAColumn", direction: "asc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }])
  })

  it("treats undefined sort the same as an empty chain", () => {
    expect(buildPropertiesOrderBy(undefined)).toEqual(buildPropertiesOrderBy({ entries: [] }))
  })
})
