import { describe, it, expect } from "vitest"
import { buildInventorySplitOffHref } from "@/hooks/navigation/routes"

describe("buildInventorySplitOffHref", () => {
  it("targets the inventory create flow in split-off mode with the seed params", () => {
    const href = buildInventorySplitOffHref({ sourceInventoryId: "inv-1", quantity: "12.5" })
    const url = new URL(href, "https://example.test")

    expect(url.pathname).toBe("/dashboard/inventory/new")
    expect(url.searchParams.get("sourceId")).toBe("inv-1")
    expect(url.searchParams.get("mode")).toBe("split-off")
    expect(url.searchParams.get("qty")).toBe("12.5")
  })

  it("threads returnTo when provided", () => {
    const href = buildInventorySplitOffHref({
      sourceInventoryId: "inv-1",
      quantity: "3",
      returnTo: "/dashboard/inventory/record?inventoryId=inv-1",
    })
    const url = new URL(href, "https://example.test")

    expect(url.searchParams.get("returnTo")).toBe("/dashboard/inventory/record?inventoryId=inv-1")
  })

  it("omits qty from the query when the quantity is empty", () => {
    // buildRecordCreateHref drops falsy params, so an empty split quantity simply
    // leaves Starting Stock blank on the seeded form.
    const href = buildInventorySplitOffHref({ sourceInventoryId: "inv-1", quantity: "" })
    const url = new URL(href, "https://example.test")

    expect(url.searchParams.has("qty")).toBe(false)
    expect(url.searchParams.get("mode")).toBe("split-off")
  })
})
