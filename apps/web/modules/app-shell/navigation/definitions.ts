export type FlooringNavGroupId = "management" | "operations" | "accounting" | "catalog" | "users"

export type FlooringNavGroup = {
  id: FlooringNavGroupId
  label: string
}

export const FLOORING_NAV_GROUPS: FlooringNavGroup[] = [
  { id: "management", label: "Management" },
  { id: "operations", label: "Operations" },
  { id: "accounting", label: "Accounting" },
  { id: "catalog", label: "Catalog" },
  { id: "users", label: "Users" },
]

export type FlooringNavItem = {
  slug: string
  name: string
  href: string
  group: FlooringNavGroupId
}

export const FLOORING_NAV_ITEMS: FlooringNavItem[] = [
  { slug: "flooring-work-orders", name: "Work Orders", href: "/dashboard/work-orders", group: "management" },
  { slug: "flooring-templates", name: "Templates", href: "/dashboard/templates", group: "management" },
  { slug: "flooring-properties", name: "Properties", href: "/dashboard/properties", group: "management" },
  {
    slug: "flooring-entities",
    name: "Entities",
    href: "/dashboard/entities",
    group: "management",
  },
  { slug: "flooring-adjustments", name: "Adjustments", href: "/dashboard/adjustments", group: "operations" },
  { slug: "flooring-payments", name: "Payments", href: "/dashboard/payments", group: "accounting" },
  { slug: "flooring-inventory", name: "Inventory", href: "/dashboard/inventory", group: "operations" },
  { slug: "flooring-imports", name: "Imports", href: "/dashboard/imports", group: "operations" },
  { slug: "products", name: "Products", href: "/dashboard/products", group: "operations" },
  { slug: "flooring-job-types", name: "Job Types", href: "/dashboard/job-types", group: "catalog" },
  { slug: "flooring-entity-types", name: "Entity Types", href: "/dashboard/entity-types", group: "catalog" },
  { slug: "flooring-manufacturers", name: "Manufacturers", href: "/dashboard/manufacturers", group: "catalog" },
  { slug: "flooring-warehouse", name: "Warehouse", href: "/dashboard/warehouse", group: "catalog" },
  { slug: "flooring-unit-of-measures", name: "Unit Of Measures", href: "/dashboard/unit-of-measures", group: "catalog" },
  { slug: "flooring-categories", name: "Categories", href: "/dashboard/categories", group: "catalog" },
  { slug: "flooring-users", name: "Users", href: "/dashboard/users", group: "users" },
  { slug: "flooring-user-activity", name: "Login Activity", href: "/dashboard/user-activity", group: "users" },
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
