import { describe, expect, it } from "vitest"
import {
  FLOORING_NAV_ITEMS,
  isNavItemVisible,
} from "@/modules/app-shell/navigation/definitions"

// isNavItemVisible is the single declarative rank gate the nav rail, drawer, and
// home launcher all share. Items with no `minRank` are universal; otherwise the
// viewer must rank at or above it (lower RANK_ORDER = higher privilege).
const item = (slug: string) => {
  const found = FLOORING_NAV_ITEMS.find((navItem) => navItem.slug === slug)
  if (!found) throw new Error(`missing nav item: ${slug}`)
  return found
}

describe("isNavItemVisible", () => {
  it("shows ungated items to every rank", () => {
    const workOrders = item("flooring-work-orders")
    expect(workOrders.minRank).toBeUndefined()
    expect(isNavItemVisible(workOrders, "TIER_3")).toBe(true)
  })

  it("gates Payments at TIER_2 (hidden from TIER_3)", () => {
    const navItem = item("flooring-payments")
    expect(navItem.minRank).toBe("TIER_2")
    expect(isNavItemVisible(navItem, "TIER_2")).toBe(true)
    expect(isNavItemVisible(navItem, "TIER_1")).toBe(true)
    expect(isNavItemVisible(navItem, "TIER_3")).toBe(false)
  })

  it("gates Warehouse + Certificate Tracking + Job Types + Entity Types at TIER_1 (hidden from TIER_2 + TIER_3)", () => {
    for (const slug of [
      "flooring-warehouse",
      "flooring-certificate-tracking",
      "flooring-job-types",
      "flooring-entity-types",
    ]) {
      const navItem = item(slug)
      expect(navItem.minRank).toBe("TIER_1")
      expect(isNavItemVisible(navItem, "TIER_1")).toBe(true)
      expect(isNavItemVisible(navItem, "TIER_2")).toBe(false)
      expect(isNavItemVisible(navItem, "TIER_3")).toBe(false)
    }
  })

  it("keeps the Users group gated at TIER_1 (hidden from TIER_2 + TIER_3)", () => {
    for (const slug of ["flooring-users", "flooring-invites", "flooring-user-activity"]) {
      const navItem = item(slug)
      expect(navItem.minRank).toBe("TIER_1")
      expect(isNavItemVisible(navItem, "TIER_1")).toBe(true)
      expect(isNavItemVisible(navItem, "TIER_2")).toBe(false)
      expect(isNavItemVisible(navItem, "TIER_3")).toBe(false)
    }
  })
})
