import { describe, expect, it } from "vitest"
import { parseInventoryListInputFromSearchParams } from "@/modules/inventory/data/list-inventory-request"

describe("parseInventoryListInputFromSearchParams — ?sorts= parsing", () => {
  it("parses the newly added sortable fields in priority order", () => {
    const input = parseInventoryListInputFromSearchParams({
      sorts: "productName:asc,warehouse:desc,updatedAt:asc",
    })
    expect(input.sorts).toEqual([
      { field: "productName", direction: "asc" },
      { field: "warehouse", direction: "desc" },
      { field: "updatedAt", direction: "asc" },
    ])
    expect(input.sort).toEqual({ field: "productName", direction: "asc" })
  })

  it("still parses the original fields", () => {
    expect(
      parseInventoryListInputFromSearchParams({ sorts: "stockBalance:desc,location:asc" }).sorts,
    ).toEqual([
      { field: "stockBalance", direction: "desc" },
      { field: "location", direction: "asc" },
    ])
  })

  it("drops unknown / non-allowlisted fields", () => {
    expect(
      parseInventoryListInputFromSearchParams({ sorts: "bogus:asc,productName:asc,id:desc" }).sorts,
    ).toEqual([{ field: "productName", direction: "asc" }])
  })

  it("defaults a missing or invalid direction to desc", () => {
    expect(parseInventoryListInputFromSearchParams({ sorts: "warehouse" }).sorts).toEqual([
      { field: "warehouse", direction: "desc" },
    ])
    expect(parseInventoryListInputFromSearchParams({ sorts: "warehouse:sideways" }).sorts).toEqual([
      { field: "warehouse", direction: "desc" },
    ])
  })

  it("dedupes a repeated field, keeping the first occurrence's direction", () => {
    expect(
      parseInventoryListInputFromSearchParams({ sorts: "productName:asc,productName:desc" }).sorts,
    ).toEqual([{ field: "productName", direction: "asc" }])
  })

  it("caps at 3 sort levels", () => {
    const input = parseInventoryListInputFromSearchParams({
      sorts: "productName:asc,warehouse:asc,location:asc,stockBalance:asc",
    })
    expect(input.sorts).toHaveLength(3)
    expect(input.sorts?.map((entry) => entry.field)).toEqual([
      "productName",
      "warehouse",
      "location",
    ])
  })

  it("emits no sort when no sort params are present (server base order applies)", () => {
    const input = parseInventoryListInputFromSearchParams({})
    expect(input.sorts).toBeUndefined()
    expect(input.sort).toBeUndefined()
  })

  it("still honors a legacy ?sortField= bookmark", () => {
    const input = parseInventoryListInputFromSearchParams({ sortField: "location", sort: "asc" })
    expect(input.sorts).toEqual([{ field: "location", direction: "asc" }])
  })
})
