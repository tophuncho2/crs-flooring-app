import { describe, expect, it } from "vitest"
import { buildPageHrefWithSearchParams } from "@/server/pagination"

describe("buildPageHrefWithSearchParams", () => {
  it("preserves active inventory filters when building page links", () => {
    expect(
      buildPageHrefWithSearchParams("/dashboard/flooring/inventory", 4, {
        q: "oak",
        status: "pending",
        warehouse: "wh-2",
        page: "2",
      }),
    ).toBe("/dashboard/flooring/inventory?q=oak&status=pending&warehouse=wh-2&page=4")
  })

  it("removes the page param when linking back to page one", () => {
    expect(
      buildPageHrefWithSearchParams("/dashboard/flooring/inventory", 1, {
        q: "oak",
        status: "pending",
        warehouse: "wh-2",
        page: "2",
      }),
    ).toBe("/dashboard/flooring/inventory?q=oak&status=pending&warehouse=wh-2")
  })

  it("preserves stacked workflow 1 filters across inventory pages", () => {
    expect(
      buildPageHrefWithSearchParams("/dashboard/flooring/inventory", 3, {
        q: "oak",
        status: "final",
        warehouse: "wh-2",
        category: "cat-1",
        product: "prod-1",
        sort: "desc",
        grouped: "1",
        groups: "warehouse,product",
      }),
    ).toBe("/dashboard/flooring/inventory?q=oak&status=final&warehouse=wh-2&category=cat-1&product=prod-1&sort=desc&grouped=1&groups=warehouse%2Cproduct&page=3")
  })

  it("preserves shared work-order filters across pages", () => {
    expect(
      buildPageHrefWithSearchParams("/dashboard/flooring/work-orders", 2, {
        q: "oak",
        status: "BUILDING_ORDER",
        warehouse: "wh-1",
        sort: "asc",
      }),
    ).toBe("/dashboard/flooring/work-orders?q=oak&status=BUILDING_ORDER&warehouse=wh-1&sort=asc&page=2")
  })
})
