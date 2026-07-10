import { describe, expect, it } from "vitest"
import {
  buildWorkOrdersOrderBy,
  workOrderFieldOrderBy,
} from "../../src/work-orders/order-by.js"

/** The fields the work-orders Sort menu / header carets expose, with the Prisma
 * clause each must produce. Kept here as the executable spec for the data layer. */
const FIELD_CLAUSE: Record<string, Record<string, unknown>> = {
  scheduledFor: { scheduledFor: { sort: "asc", nulls: "last" } },
  timeOfDay: { timeOfDay: { sort: "asc", nulls: "last" } },
  property: { property: { name: "asc" } },
  entity: { property: { entity: { entity: "asc" } } },
  warehouse: { warehouse: { name: "asc" } },
  jobType: { jobType: { name: "asc" } },
  createdAt: { createdAt: "asc" },
  updatedAt: { updatedAt: "asc" },
}

const lastKey = (orderBy: Array<Record<string, unknown>>) =>
  Object.keys(orderBy[orderBy.length - 1])

describe("buildWorkOrdersOrderBy", () => {
  it("maps every exposed field to the correct Prisma clause as the leading sort", () => {
    for (const [field, clause] of Object.entries(FIELD_CLAUSE)) {
      const orderBy = buildWorkOrdersOrderBy({ entries: [{ field, direction: "asc" }] })
      expect(orderBy[0], `leading clause for ${field}`).toEqual(clause)
    }
  })

  it("orders nullable columns with nulls last", () => {
    expect(workOrderFieldOrderBy("scheduledFor", "desc")).toEqual({
      scheduledFor: { sort: "desc", nulls: "last" },
    })
    expect(workOrderFieldOrderBy("timeOfDay", "asc")).toEqual({
      timeOfDay: { sort: "asc", nulls: "last" },
    })
  })

  it("always ends with `id` as the final tiebreak — every shape", () => {
    const shapes: Array<{ field: string; direction: "asc" | "desc" }[]> = [
      [],
      [{ field: "property", direction: "asc" }],
      [{ field: "createdAt", direction: "asc" }],
      [{ field: "updatedAt", direction: "desc" }],
      [
        { field: "warehouse", direction: "asc" },
        { field: "jobType", direction: "desc" },
        { field: "createdAt", direction: "asc" },
      ],
    ]
    for (const entries of shapes) {
      const orderBy = buildWorkOrdersOrderBy({ entries }) as Array<Record<string, unknown>>
      expect(lastKey(orderBy), JSON.stringify(entries)).toEqual(["id"])
    }
  })

  it("appends the createdAt tiebreak when the user did not select it", () => {
    const orderBy = buildWorkOrdersOrderBy({
      entries: [{ field: "property", direction: "asc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([
      { property: { name: "asc" } },
      { createdAt: "asc" },
      { id: "asc" },
    ])
  })

  it("does NOT double the createdAt clause when the user sorts by it", () => {
    const orderBy = buildWorkOrdersOrderBy({
      entries: [{ field: "createdAt", direction: "desc" }],
    }) as Array<Record<string, unknown>>
    const createdAtClauses = orderBy.filter((clause) => "createdAt" in clause)
    expect(createdAtClauses).toHaveLength(1)
    expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }])
  })

  it("keeps a SECONDARY createdAt's own direction (regression: it used to inherit the primary's)", () => {
    const orderBy = buildWorkOrdersOrderBy({
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

  it("falls back to the uniform base order when every field is unknown", () => {
    const orderBy = buildWorkOrdersOrderBy({
      entries: [{ field: "totallyNotAColumn", direction: "asc" }],
    }) as Array<Record<string, unknown>>
    expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }])
  })

  it("collapses an identical duplicate clause (field-level dedup is the parser's job)", () => {
    const orderBy = buildWorkOrdersOrderBy({
      entries: [
        { field: "property", direction: "asc" },
        { field: "property", direction: "asc" },
      ],
    }) as Array<Record<string, unknown>>
    const propertyClauses = orderBy.filter((clause) => "property" in clause)
    expect(propertyClauses).toEqual([{ property: { name: "asc" } }])
  })

  it("treats undefined sort the same as an empty chain", () => {
    expect(buildWorkOrdersOrderBy(undefined)).toEqual(buildWorkOrdersOrderBy({ entries: [] }))
  })
})
