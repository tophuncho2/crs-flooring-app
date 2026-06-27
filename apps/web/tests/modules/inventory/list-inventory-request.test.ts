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

  it("falls back to createdAt desc when no sorts param is present", () => {
    const input = parseInventoryListInputFromSearchParams({})
    expect(input.sorts).toEqual([{ field: "createdAt", direction: "desc" }])
    expect(input.sort).toEqual({ field: "createdAt", direction: "desc" })
  })
})
