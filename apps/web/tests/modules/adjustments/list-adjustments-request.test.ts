import { describe, expect, it } from "vitest"
import {
  buildAdjustmentsExportQuery,
  parseAdjustmentsListInputFromSearchParams,
} from "@/modules/adjustments/data/list-adjustments-request"

describe("parseAdjustmentsListInputFromSearchParams — identity search bars", () => {
  it("parses adjNumber alongside the inv#/roll#/dye/note bars", () => {
    const input = parseAdjustmentsListInputFromSearchParams({
      adjNumber: "12",
      invNumber: "200",
      rollNumber: "R-7",
      dyeLot: "D9",
      note: "ripped",
    })

    expect(input.filters?.adjNumber).toBe("12")
    expect(input.filters?.invNumber).toBe("200")
    expect(input.filters?.rollNumber).toBe("R-7")
    expect(input.filters?.dyeLot).toBe("D9")
    expect(input.filters?.note).toBe("ripped")
  })

  it("omits adjNumber when blank/whitespace", () => {
    const input = parseAdjustmentsListInputFromSearchParams({ adjNumber: "   " })
    expect(input.filters).toBeUndefined()
  })

  it("trims adjNumber and tolerates an array-valued param", () => {
    const input = parseAdjustmentsListInputFromSearchParams({ adjNumber: ["  5 ", "9"] })
    expect(input.filters?.adjNumber).toBe("5")
  })
})

describe("parseAdjustmentsListInputFromSearchParams — ?sorts= parsing", () => {
  it("parses the sortable fields in priority order", () => {
    const input = parseAdjustmentsListInputFromSearchParams({
      sorts: "productName:asc,location:desc,updatedAt:asc",
    })
    expect(input.sorts).toEqual([
      { field: "productName", direction: "asc" },
      { field: "location", direction: "desc" },
      { field: "updatedAt", direction: "asc" },
    ])
    expect(input.sort).toEqual({ field: "productName", direction: "asc" })
  })

  it("drops unknown / non-allowlisted fields", () => {
    expect(
      parseAdjustmentsListInputFromSearchParams({ sorts: "bogus:asc,location:asc,id:desc" }).sorts,
    ).toEqual([{ field: "location", direction: "asc" }])
  })

  it("defaults a missing or invalid direction to desc", () => {
    expect(parseAdjustmentsListInputFromSearchParams({ sorts: "location" }).sorts).toEqual([
      { field: "location", direction: "desc" },
    ])
    expect(parseAdjustmentsListInputFromSearchParams({ sorts: "location:sideways" }).sorts).toEqual([
      { field: "location", direction: "desc" },
    ])
  })

  it("dedupes a repeated field, keeping the first occurrence's direction", () => {
    expect(
      parseAdjustmentsListInputFromSearchParams({ sorts: "productName:asc,productName:desc" }).sorts,
    ).toEqual([{ field: "productName", direction: "asc" }])
  })

  it("caps at 3 sort levels", () => {
    const input = parseAdjustmentsListInputFromSearchParams({
      sorts: "productName:asc,location:asc,createdAt:asc,updatedAt:asc",
    })
    expect(input.sorts).toHaveLength(3)
    expect(input.sorts?.map((entry) => entry.field)).toEqual([
      "productName",
      "location",
      "createdAt",
    ])
  })

  it("falls back to createdAt desc when no sorts param is present", () => {
    const input = parseAdjustmentsListInputFromSearchParams({})
    expect(input.sorts).toEqual([{ field: "createdAt", direction: "desc" }])
    expect(input.sort).toEqual({ field: "createdAt", direction: "desc" })
  })
})

describe("buildAdjustmentsExportQuery", () => {
  it("reproduces the list query minus page/pageSize, preserving sorts + filters", () => {
    const params = new URLSearchParams(
      buildAdjustmentsExportQuery({
        sorts: [
          { field: "productName", direction: "asc" },
          { field: "location", direction: "desc" },
        ],
        filters: { warehouseId: ["w1", "w2"], adjNumber: "12" },
        page: 3,
        pageSize: 25,
      }),
    )

    expect(params.has("page")).toBe(false)
    expect(params.has("pageSize")).toBe(false)
    expect(params.get("sorts")).toBe("productName:asc,location:desc")
    expect(params.getAll("warehouseId")).toEqual(["w1", "w2"])
    expect(params.get("adjNumber")).toBe("12")
  })

  it("emits an empty string when there are no sorts or filters", () => {
    expect(
      buildAdjustmentsExportQuery({ filters: undefined, page: 1, pageSize: 25 }),
    ).toBe("")
  })
})
