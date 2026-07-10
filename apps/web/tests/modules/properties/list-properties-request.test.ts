import { describe, expect, it } from "vitest"
import { parsePropertiesListInputFromSearchParams } from "@/modules/properties/data/list-properties-request"

describe("parsePropertiesListInputFromSearchParams — sort", () => {
  it("emits no sort when no sorts param is present (server base order applies)", () => {
    const input = parsePropertiesListInputFromSearchParams({})
    expect(input.sorts).toBeUndefined()
    expect(input.sort).toBeUndefined()
  })

  it("parses an ordered multi-column sorts param", () => {
    const input = parsePropertiesListInputFromSearchParams({
      sorts: "entity:asc,createdAt:desc",
    })
    expect(input.sorts).toEqual([
      { field: "entity", direction: "asc" },
      { field: "createdAt", direction: "desc" },
    ])
  })

  it("drops unknown fields, dedupes, and caps at 3 levels", () => {
    const input = parsePropertiesListInputFromSearchParams({
      sorts: "bogus:asc,name:asc,name:desc,entity:asc,createdAt:asc,updatedAt:desc",
    })
    expect(input.sorts).toEqual([
      { field: "name", direction: "asc" },
      { field: "entity", direction: "asc" },
      { field: "createdAt", direction: "asc" },
    ])
  })
})
