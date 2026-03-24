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
})
