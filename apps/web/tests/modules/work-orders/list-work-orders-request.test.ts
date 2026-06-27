import { describe, expect, it } from "vitest"
import { parseWorkOrdersListInputFromSearchParams } from "@/modules/work-orders/data/list-work-orders-request"

describe("parseWorkOrdersListInputFromSearchParams — ?sorts= parsing", () => {
  it("parses the newly added sortable fields in priority order", () => {
    const input = parseWorkOrdersListInputFromSearchParams({
      sorts: "timeOfDay:asc,warehouse:desc,jobType:asc",
    })
    expect(input.sorts).toEqual([
      { field: "timeOfDay", direction: "asc" },
      { field: "warehouse", direction: "desc" },
      { field: "jobType", direction: "asc" },
    ])
    expect(input.sort).toEqual({ field: "timeOfDay", direction: "asc" })
  })

  it("accepts updatedAt", () => {
    expect(parseWorkOrdersListInputFromSearchParams({ sorts: "updatedAt:asc" }).sorts).toEqual([
      { field: "updatedAt", direction: "asc" },
    ])
  })

  it("drops unknown / non-allowlisted fields", () => {
    expect(
      parseWorkOrdersListInputFromSearchParams({ sorts: "bogus:asc,property:asc,id:desc" }).sorts,
    ).toEqual([{ field: "property", direction: "asc" }])
  })

  it("defaults a missing or invalid direction to desc", () => {
    expect(parseWorkOrdersListInputFromSearchParams({ sorts: "property" }).sorts).toEqual([
      { field: "property", direction: "desc" },
    ])
    expect(parseWorkOrdersListInputFromSearchParams({ sorts: "property:sideways" }).sorts).toEqual([
      { field: "property", direction: "desc" },
    ])
  })

  it("dedupes a repeated field, keeping the first occurrence's direction", () => {
    expect(
      parseWorkOrdersListInputFromSearchParams({ sorts: "property:asc,property:desc" }).sorts,
    ).toEqual([{ field: "property", direction: "asc" }])
  })

  it("caps at 3 sort levels", () => {
    const input = parseWorkOrdersListInputFromSearchParams({
      sorts: "property:asc,entity:asc,warehouse:asc,jobType:asc",
    })
    expect(input.sorts).toHaveLength(3)
    expect(input.sorts?.map((entry) => entry.field)).toEqual(["property", "entity", "warehouse"])
  })

  it("falls back to createdAt desc when no sorts param is present", () => {
    const input = parseWorkOrdersListInputFromSearchParams({})
    expect(input.sorts).toEqual([{ field: "createdAt", direction: "desc" }])
    expect(input.sort).toEqual({ field: "createdAt", direction: "desc" })
  })
})

describe("parseWorkOrdersListInputFromSearchParams — text filters", () => {
  it("reads the purchaseOrderNumber search bar into filters", () => {
    const input = parseWorkOrdersListInputFromSearchParams({ purchaseOrderNumber: "PO-48" })
    expect(input.filters?.purchaseOrderNumber).toEqual(["PO-48"])
  })

  it("omits purchaseOrderNumber from filters when the param is absent", () => {
    const input = parseWorkOrdersListInputFromSearchParams({})
    expect(input.filters?.purchaseOrderNumber).toBeUndefined()
  })
})
