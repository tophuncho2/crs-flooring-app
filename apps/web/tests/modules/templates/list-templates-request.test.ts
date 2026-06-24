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
