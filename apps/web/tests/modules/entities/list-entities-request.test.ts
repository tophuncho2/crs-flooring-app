import { describe, expect, it } from "vitest"
import { parseEntitiesListInputFromSearchParams } from "@/modules/entities/data/list-entities-request"

describe("parseEntitiesListInputFromSearchParams — sort", () => {
  it("defaults to entity ASC when no sorts param is present", () => {
    const input = parseEntitiesListInputFromSearchParams({})
    expect(input.sorts).toEqual([{ field: "entity", direction: "asc" }])
    expect(input.sort).toEqual({ field: "entity", direction: "asc" })
  })

  it("parses an ordered multi-column sorts param", () => {
    const input = parseEntitiesListInputFromSearchParams({
      sorts: "state:asc,createdAt:desc",
    })
    expect(input.sorts).toEqual([
      { field: "state", direction: "asc" },
      { field: "createdAt", direction: "desc" },
    ])
  })

  it("defaults a missing or invalid direction to asc", () => {
    const input = parseEntitiesListInputFromSearchParams({
      sorts: "entity,updatedAt:sideways",
    })
    expect(input.sorts).toEqual([
      { field: "entity", direction: "asc" },
      { field: "updatedAt", direction: "asc" },
    ])
  })

  it("drops unknown fields, dedupes, and caps at 3 levels", () => {
    const input = parseEntitiesListInputFromSearchParams({
      sorts: "bogus:asc,entity:asc,entity:desc,state:asc,createdAt:asc,updatedAt:desc",
    })
    expect(input.sorts).toEqual([
      { field: "entity", direction: "asc" },
      { field: "state", direction: "asc" },
      { field: "createdAt", direction: "asc" },
    ])
  })
})
