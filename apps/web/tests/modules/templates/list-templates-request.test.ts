import { describe, expect, it } from "vitest"
import { parseTemplatesListInputFromSearchParams } from "@/modules/templates/data/list-templates-request"

describe("parseTemplatesListInputFromSearchParams — unit-type / description search bars", () => {
  it("parses unitType and description alongside the entity/property chips", () => {
    const input = parseTemplatesListInputFromSearchParams({
      unitType: "1BR",
      description: "carpet",
      entityId: "ent-1",
      propertyId: "prop-1",
    })

    expect(input.filters?.unitType).toEqual(["1BR"])
    expect(input.filters?.description).toEqual(["carpet"])
    expect(input.filters?.entityId).toEqual(["ent-1"])
    expect(input.filters?.propertyId).toEqual(["prop-1"])
  })

  it("omits the search bars when blank/whitespace", () => {
    const input = parseTemplatesListInputFromSearchParams({
      unitType: "   ",
      description: "",
    })
    expect(input.filters).toBeUndefined()
  })

  it("does not carry a free-text `q` search param anymore", () => {
    const input = parseTemplatesListInputFromSearchParams({ q: "oak" })
    expect(input.filters).toBeUndefined()
    expect((input as { search?: string }).search).toBeUndefined()
  })
})

describe("parseTemplatesListInputFromSearchParams — sort", () => {
  it("emits no sort when no sorts param is present (server base order applies)", () => {
    const input = parseTemplatesListInputFromSearchParams({})
    expect(input.sorts).toBeUndefined()
    expect(input.sort).toBeUndefined()
  })

  it("parses an ordered multi-column sorts param", () => {
    const input = parseTemplatesListInputFromSearchParams({
      sorts: "unitType:asc,createdAt:desc",
    })
    expect(input.sorts).toEqual([
      { field: "unitType", direction: "asc" },
      { field: "createdAt", direction: "desc" },
    ])
  })

  it("drops unknown fields, dedupes, and caps at 3 levels", () => {
    const input = parseTemplatesListInputFromSearchParams({
      sorts: "bogus:asc,property:asc,property:desc,entity:asc,unitType:asc,createdAt:desc",
    })
    expect(input.sorts).toEqual([
      { field: "property", direction: "asc" },
      { field: "entity", direction: "asc" },
      { field: "unitType", direction: "asc" },
    ])
  })
})
