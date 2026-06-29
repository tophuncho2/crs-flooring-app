import { describe, expect, it } from "vitest"
import {
  buildTemplatesOrderBy,
  templateFieldOrderBy,
} from "../../../src/management/templates/order-by.js"

/** The fields the templates Sort menu exposes, with the Prisma clause each must
 * produce. Kept here as the executable spec for the data layer. */
const FIELD_CLAUSE: Record<string, Record<string, unknown>> = {
  property: { property: { name: "asc" } },
  entity: { property: { entity: { entity: "asc" } } },
  unitType: { unitType: "asc" },
  createdAt: { createdAt: "asc" },
  updatedAt: { updatedAt: "asc" },
}

const lastKey = (orderBy: Array<Record<string, unknown>>) =>
  Object.keys(orderBy[orderBy.length - 1])

describe("buildTemplatesOrderBy", () => {
  it("maps every exposed field to the correct Prisma clause as the leading sort", () => {
    for (const [field, clause] of Object.entries(FIELD_CLAUSE)) {
      const orderBy = buildTemplatesOrderBy({ entries: [{ field, direction: "asc" }] })
      expect(orderBy[0], `leading clause for ${field}`).toEqual(clause)
    }
  })

  it("resolves the 2-hop entity relation through property.entity.entity", () => {
    expect(templateFieldOrderBy("entity", "desc")).toEqual({
      property: { entity: { entity: "desc" } },
    })
  })

  it("always ends with `id` as the final tiebreak — every shape", () => {
    const shapes: Array<{ field: string; direction: "asc" | "desc" }[]> = [
      [],
      [{ field: "property", direction: "asc" }],
      [{ field: "createdAt", direction: "asc" }],
      [{ field: "updatedAt", direction: "desc" }],
      [
        { field: "property", direction: "asc" },
        { field: "unitType", direction: "desc" },
        { field: "createdAt", direction: "asc" },
      ],
    ]
    for (const entries of shapes) {
      const orderBy = buildTemplatesOrderBy({ entries }) as Array<Record<string, unknown>>
      expect(lastKey(orderBy), JSON.stringify(entries)).toEqual(["id"])
    }
  })

  it("appends the createdAt tiebreak when the user did not select it", () => {
    const orderBy = buildTemplatesOrderBy({
      entries: [{ field: "property", direction: "asc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([
      { property: { name: "asc" } },
      { createdAt: "asc" },
      { id: "asc" },
    ])
  })

  it("does NOT double the createdAt clause when the user sorts by it", () => {
    const orderBy = buildTemplatesOrderBy({
      entries: [{ field: "createdAt", direction: "desc" }],
    }) as Array<Record<string, unknown>>
    const createdAtClauses = orderBy.filter((clause) => "createdAt" in clause)
    expect(createdAtClauses).toHaveLength(1)
    expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }])
  })

  it("keeps a SECONDARY createdAt's own direction", () => {
    const orderBy = buildTemplatesOrderBy({
      entries: [
        { field: "property", direction: "desc" },
        { field: "createdAt", direction: "asc" },
      ],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([
      { property: { name: "desc" } },
      { createdAt: "asc" }, // ← user's own direction, not the lead column's desc
      { id: "desc" }, // tiebreak id mirrors the lead column
    ])
  })

  it("skips unknown fields but still produces a deterministic order", () => {
    const orderBy = buildTemplatesOrderBy({
      entries: [{ field: "totallyNotAColumn", direction: "asc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }])
  })

  it("treats undefined sort the same as an empty chain", () => {
    expect(buildTemplatesOrderBy(undefined)).toEqual(buildTemplatesOrderBy({ entries: [] }))
  })
})
