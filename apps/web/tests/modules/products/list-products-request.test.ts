import { describe, expect, it } from "vitest"
import {
  buildProductsListSearchString,
  parseProductsListInputFromSearchParams,
} from "@/modules/products/data/list-products-request"

describe("parseProductsListInputFromSearchParams — ?sorts= parsing", () => {
  it("parses an ordered multi-column sort in priority order", () => {
    const input = parseProductsListInputFromSearchParams({
      sorts: "category:asc,style:desc,updatedAt:asc",
    })
    expect(input.sorts).toEqual([
      { field: "category", direction: "asc" },
      { field: "style", direction: "desc" },
      { field: "updatedAt", direction: "asc" },
    ])
  })

  it("keeps createdAt/color fields", () => {
    expect(
      parseProductsListInputFromSearchParams({ sorts: "createdAt:desc,color:asc" }).sorts,
    ).toEqual([
      { field: "createdAt", direction: "desc" },
      { field: "color", direction: "asc" },
    ])
  })

  it("drops unknown fields", () => {
    expect(
      parseProductsListInputFromSearchParams({ sorts: "bogus:asc,category:asc,id:desc" }).sorts,
    ).toEqual([{ field: "category", direction: "asc" }])
  })

  it("defaults a missing/invalid direction to desc", () => {
    expect(parseProductsListInputFromSearchParams({ sorts: "category" }).sorts).toEqual([
      { field: "category", direction: "desc" },
    ])
    expect(parseProductsListInputFromSearchParams({ sorts: "category:sideways" }).sorts).toEqual([
      { field: "category", direction: "desc" },
    ])
  })

  it("dedupes a repeated field, keeping the first", () => {
    expect(
      parseProductsListInputFromSearchParams({ sorts: "category:asc,category:desc" }).sorts,
    ).toEqual([{ field: "category", direction: "asc" }])
  })

  it("caps at 3 sort levels", () => {
    const input = parseProductsListInputFromSearchParams({
      sorts: "category:asc,style:asc,color:asc,createdAt:asc",
    })
    expect(input.sorts).toHaveLength(3)
    expect(input.sorts?.map((entry) => entry.field)).toEqual(["category", "style", "color"])
  })

  it("emits no sort when no sorts param is present (server base order applies)", () => {
    // No client seed: empty sort flows to the server's uniform base order
    // (createdAt desc, id desc). The SSR key matches the client's de-seeded render.
    const input = parseProductsListInputFromSearchParams({})
    expect(input.sorts).toBeUndefined()
    expect(input.sort).toBeUndefined()
  })

  it("round-trips through the URL builder", () => {
    const sorts = [
      { field: "style", direction: "asc" as const },
      { field: "createdAt", direction: "desc" as const },
    ]
    const query = buildProductsListSearchString({ sorts, page: 1 })
    expect(query).toContain("sorts=style%3Aasc%2CcreatedAt%3Adesc")
    expect(parseProductsListInputFromSearchParams({ sorts: "style:asc,createdAt:desc" }).sorts).toEqual(
      sorts,
    )
  })
})
