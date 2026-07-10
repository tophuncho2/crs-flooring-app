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

  it("emits no sort when no sort params are present (server base order applies)", () => {
    const input = parseWorkOrdersListInputFromSearchParams({})
    expect(input.sorts).toBeUndefined()
    expect(input.sort).toBeUndefined()
  })

  it("still honors a legacy ?sortField= bookmark", () => {
    const input = parseWorkOrdersListInputFromSearchParams({ sortField: "property", sort: "asc" })
    expect(input.sorts).toEqual([{ field: "property", direction: "asc" }])
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

  it("reads the WO-owned address search bars into filters", () => {
    const input = parseWorkOrdersListInputFromSearchParams({
      streetAddress: "123 Main",
      city: "Austin",
      state: "TX",
      postalCode: "787",
    })
    expect(input.filters?.streetAddress).toEqual(["123 Main"])
    expect(input.filters?.city).toEqual(["Austin"])
    expect(input.filters?.state).toEqual(["TX"])
    expect(input.filters?.postalCode).toEqual(["787"])
  })

  it("omits the address filters when their params are absent", () => {
    const input = parseWorkOrdersListInputFromSearchParams({})
    expect(input.filters?.streetAddress).toBeUndefined()
    expect(input.filters?.city).toBeUndefined()
    expect(input.filters?.state).toBeUndefined()
    expect(input.filters?.postalCode).toBeUndefined()
  })
})
