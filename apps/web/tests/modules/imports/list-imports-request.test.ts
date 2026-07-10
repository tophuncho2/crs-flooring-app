import { describe, expect, it } from "vitest"
import { parseImportsListInputFromSearchParams } from "@/modules/imports/data/list-imports-request"

describe("parseImportsListInputFromSearchParams — sort", () => {
  it("emits no sort when no sorts param is present (server base order applies)", () => {
    const input = parseImportsListInputFromSearchParams({})
    expect(input.sorts).toBeUndefined()
    expect(input.sort).toBeUndefined()
  })

  it("parses an ordered multi-column sorts param", () => {
    const input = parseImportsListInputFromSearchParams({
      sorts: "updatedAt:asc,createdAt:desc",
    })
    expect(input.sorts).toEqual([
      { field: "updatedAt", direction: "asc" },
      { field: "createdAt", direction: "desc" },
    ])
  })

  it("drops unknown fields, dedupes, and caps at the allowed set", () => {
    const input = parseImportsListInputFromSearchParams({
      sorts: "bogus:asc,importNumber:desc,createdAt:asc,createdAt:desc,updatedAt:desc",
    })
    expect(input.sorts).toEqual([
      { field: "createdAt", direction: "asc" },
      { field: "updatedAt", direction: "desc" },
    ])
  })
})
