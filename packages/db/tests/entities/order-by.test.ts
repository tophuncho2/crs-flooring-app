import { describe, expect, it } from "vitest"
import {
  buildEntitiesOrderBy,
  entityFieldOrderBy,
} from "../../src/entities/order-by.js"

/** The fields the entities Sort menu exposes, with the Prisma clause each must
 * produce. Kept here as the executable spec for the data layer. `state` is
 * nullable, so nulls sink last regardless of direction. */
const FIELD_CLAUSE: Record<string, Record<string, unknown>> = {
  entity: { entity: "asc" },
  state: { state: { sort: "asc", nulls: "last" } },
  createdAt: { createdAt: "asc" },
  updatedAt: { updatedAt: "asc" },
}

const lastKey = (orderBy: Array<Record<string, unknown>>) =>
  Object.keys(orderBy[orderBy.length - 1])

describe("buildEntitiesOrderBy", () => {
  it("maps every exposed field to the correct Prisma clause as the leading sort", () => {
    for (const [field, clause] of Object.entries(FIELD_CLAUSE)) {
      const orderBy = buildEntitiesOrderBy({ entries: [{ field, direction: "asc" }] })
      expect(orderBy[0], `leading clause for ${field}`).toEqual(clause)
    }
  })

  it("sinks nulls last on the nullable `state` column — both directions", () => {
    expect(entityFieldOrderBy("state", "asc")).toEqual({
      state: { sort: "asc", nulls: "last" },
    })
    expect(entityFieldOrderBy("state", "desc")).toEqual({
      state: { sort: "desc", nulls: "last" },
    })
  })

  it("always ends with `id` as the final tiebreak — every shape", () => {
    const shapes: Array<{ field: string; direction: "asc" | "desc" }[]> = [
      [],
      [{ field: "entity", direction: "asc" }],
      [{ field: "createdAt", direction: "asc" }],
      [{ field: "updatedAt", direction: "desc" }],
      [
        { field: "entity", direction: "asc" },
        { field: "state", direction: "desc" },
        { field: "createdAt", direction: "asc" },
      ],
    ]
    for (const entries of shapes) {
      const orderBy = buildEntitiesOrderBy({ entries }) as Array<Record<string, unknown>>
      expect(lastKey(orderBy), JSON.stringify(entries)).toEqual(["id"])
    }
  })

  it("defaults the tiebreak to asc (entity A→Z) with no entries", () => {
    expect(buildEntitiesOrderBy({ entries: [] })).toEqual([
      { createdAt: "asc" },
      { id: "asc" },
    ])
  })

  it("appends the createdAt tiebreak when the user did not select it", () => {
    const orderBy = buildEntitiesOrderBy({
      entries: [{ field: "entity", direction: "asc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([
      { entity: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ])
  })

  it("does NOT double the createdAt clause when the user sorts by it", () => {
    const orderBy = buildEntitiesOrderBy({
      entries: [{ field: "createdAt", direction: "desc" }],
    }) as Array<Record<string, unknown>>
    const createdAtClauses = orderBy.filter((clause) => "createdAt" in clause)
    expect(createdAtClauses).toHaveLength(1)
    expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }])
  })

  it("keeps a SECONDARY createdAt's own direction", () => {
    const orderBy = buildEntitiesOrderBy({
      entries: [
        { field: "entity", direction: "desc" },
        { field: "createdAt", direction: "asc" },
      ],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([
      { entity: "desc" },
      { createdAt: "asc" }, // ← user's own direction, not the lead column's desc
      { id: "desc" }, // tiebreak id mirrors the lead column
    ])
  })

  it("skips unknown fields but still produces a deterministic order", () => {
    const orderBy = buildEntitiesOrderBy({
      entries: [{ field: "totallyNotAColumn", direction: "asc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }])
  })

  it("treats undefined sort the same as an empty chain", () => {
    expect(buildEntitiesOrderBy(undefined)).toEqual(buildEntitiesOrderBy({ entries: [] }))
  })
})
