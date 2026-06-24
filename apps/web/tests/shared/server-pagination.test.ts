import { describe, expect, it } from "vitest"
import { buildPageHrefWithSearchParams } from "@/server/pagination"

describe("buildPageHrefWithSearchParams", () => {
  it("preserves active inventory filters when building page links", () => {
    expect(
      buildPageHrefWithSearchParams("/dashboard/inventory", 4, {
        q: "oak",
        status: "pending",
        warehouse: "wh-2",
        page: "2",
      }),
    ).toBe("/dashboard/inventory?q=oak&status=pending&warehouse=wh-2&page=4")
  })

  it("removes the page param when linking back to page one", () => {
    expect(
      buildPageHrefWithSearchParams("/dashboard/inventory", 1, {
        q: "oak",
        status: "pending",
        warehouse: "wh-2",
        page: "2",
      }),
    ).toBe("/dashboard/inventory?q=oak&status=pending&warehouse=wh-2")
  })

  it("preserves stacked workflow 1 filters across inventory pages", () => {
    expect(
      buildPageHrefWithSearchParams("/dashboard/inventory", 3, {
        q: "oak",
        status: "final",
        warehouse: "wh-2",
        category: "cat-1",
        product: "prod-1",
        sort: "desc",
      }),
    ).toBe("/dashboard/inventory?q=oak&status=final&warehouse=wh-2&category=cat-1&product=prod-1&sort=desc&page=3")
  })

  it("preserves shared work-order filters across pages", () => {
    expect(
      buildPageHrefWithSearchParams("/dashboard/work-orders", 2, {
        q: "oak",
        status: "BUILDING_ORDER",
        warehouse: "wh-1",
        sort: "asc",
      }),
    ).toBe("/dashboard/work-orders?q=oak&status=BUILDING_ORDER&warehouse=wh-1&sort=asc&page=2")
  })
})
