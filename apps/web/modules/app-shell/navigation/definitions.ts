import { hasRankAtLeast, type UserRank } from "@builders/domain"

export type FlooringNavGroupId =
  | "management"
  | "operations"
  | "accounting"
  | "catalog"
  | "users"

export type FlooringNavGroup = {
  id: FlooringNavGroupId
  label: string
}

export const FLOORING_NAV_GROUPS: FlooringNavGroup[] = [
  { id: "management", label: "Management" },
  { id: "operations", label: "Material Operations" },
  { id: "accounting", label: "Business operations" },
  { id: "catalog", label: "Catalog" },
  { id: "users", label: "Users" },
]

export type FlooringNavItem = {
  slug: string
  name: string
  href: string
  group: FlooringNavGroupId
  // Optional minimum rank to see this item in the nav rail + home launcher.
  // Absent = visible to everyone. The declarative rank gate both surfaces read.
  minRank?: UserRank
}

/**
 * Whether `rank` may see `item` in the nav surfaces. Items with no `minRank` are
 * universal; otherwise the viewer must rank at or above it. The single predicate
 * the rail, drawer, and home launcher share so their visibility never diverges.
 */
export function isNavItemVisible(item: FlooringNavItem, rank: UserRank): boolean {
  return item.minRank ? hasRankAtLeast(rank, item.minRank) : true
}

// Standalone Home entry — pinned above the grouped rail and used as the
// post-login landing. Kept OUT of FLOORING_NAV_ITEMS (those are all grouped);
// the rail renders it explicitly at the top with no group label. `group` is
// unused for that render but keeps the FlooringNavItem type intact.
export const FLOORING_HOME_NAV_ITEM: FlooringNavItem = {
  slug: "flooring-home",
  name: "Home",
  href: "/dashboard/home",
  group: "management",
}

export const FLOORING_NAV_ITEMS: FlooringNavItem[] = [
  { slug: "flooring-work-orders", name: "Work Orders", href: "/dashboard/work-orders", group: "management" },
  { slug: "templates", name: "Templates", href: "/dashboard/templates", group: "management" },
  { slug: "flooring-properties", name: "Properties", href: "/dashboard/properties", group: "management" },
  {
    slug: "flooring-entities",
    name: "Entities",
    href: "/dashboard/entities",
    group: "management",
  },
  { slug: "flooring-entity-types", name: "Entity Types", href: "/dashboard/entity-types", group: "catalog", minRank: "TIER_1" },
  { slug: "flooring-adjustments", name: "Adjustments", href: "/dashboard/adjustments", group: "operations" },
  { slug: "flooring-payments", name: "Payments", href: "/dashboard/payments", group: "accounting", minRank: "TIER_2" },
  {
    slug: "flooring-certificate-tracking",
    name: "Certificate Tracking",
    href: "/dashboard/certificate-tracking",
    group: "accounting",
    minRank: "TIER_1",
  },
  { slug: "flooring-payment-purposes", name: "Payment Purposes", href: "/dashboard/payment-purposes", group: "catalog", minRank: "TIER_1" },
  { slug: "flooring-inventory", name: "Inventory", href: "/dashboard/inventory", group: "operations" },
  { slug: "flooring-imports", name: "Imports", href: "/dashboard/imports", group: "operations" },
  { slug: "flooring-inventory-indicators", name: "Inventory Indicators", href: "/dashboard/inventory-indicators", group: "operations" },
  { slug: "products", name: "Products", href: "/dashboard/products", group: "operations" },
  { slug: "flooring-warehouse", name: "Warehouse", href: "/dashboard/warehouse", group: "accounting", minRank: "TIER_1" },
  { slug: "flooring-job-types", name: "Job Types", href: "/dashboard/job-types", group: "catalog", minRank: "TIER_1" },
  { slug: "flooring-unit-of-measures", name: "Unit Of Measures", href: "/dashboard/unit-of-measures", group: "catalog" },
  { slug: "flooring-categories", name: "Categories", href: "/dashboard/categories", group: "catalog" },
  { slug: "flooring-users", name: "Users", href: "/dashboard/users", group: "users", minRank: "TIER_1" },
  { slug: "flooring-invites", name: "Invites", href: "/dashboard/invites", group: "users", minRank: "TIER_1" },
  { slug: "flooring-user-activity", name: "Login Activity", href: "/dashboard/user-activity", group: "users", minRank: "TIER_1" },
]

// Persistent nav rail geometry — kept here so the rail and the dashboard layout
// (which shifts all content right by the rail width) stay in sync.
export const NAV_RAIL_WIDTH_CLASS = "w-14"
export const NAV_RAIL_CONTENT_OFFSET_CLASS = "pl-14"
export const NAV_RAIL_HEADER_OFFSET_CLASS = "left-14"

export function isFlooringRoute(pathname: string) {
  return pathname.startsWith("/dashboard")
}

export function isActiveFlooringItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
