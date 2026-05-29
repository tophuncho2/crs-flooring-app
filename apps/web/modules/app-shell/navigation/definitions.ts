export type FlooringNavGroupId = "management" | "operations" | "catalog"

export type FlooringNavGroup = {
  id: FlooringNavGroupId
  label: string
}

export const FLOORING_NAV_GROUPS: FlooringNavGroup[] = [
  { id: "management", label: "Management" },
  { id: "operations", label: "Operations" },
  { id: "catalog", label: "Catalog" },
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
    slug: "flooring-management-companies",
    name: "Management Companies",
    href: "/dashboard/management-companies",
    group: "management",
  },
  { slug: "flooring-adjustments", name: "Adjustments", href: "/dashboard/adjustments", group: "operations" },
  { slug: "flooring-inventory", name: "Inventory", href: "/dashboard/inventory", group: "operations" },
  { slug: "flooring-imports", name: "Imports", href: "/dashboard/imports", group: "operations" },
  { slug: "products", name: "Products", href: "/dashboard/products", group: "operations" },
  { slug: "flooring-manufacturers", name: "Manufacturers", href: "/dashboard/manufacturers", group: "operations" },
  { slug: "flooring-warehouse", name: "Warehouse", href: "/dashboard/warehouse", group: "catalog" },
  { slug: "flooring-unit-of-measures", name: "Unit Of Measures", href: "/dashboard/unit-of-measures", group: "catalog" },
  { slug: "flooring-categories", name: "Categories", href: "/dashboard/categories", group: "catalog" },
  { slug: "flooring-job-types", name: "Job Types", href: "/dashboard/job-types", group: "catalog" },
]

export function isFlooringRoute(pathname: string) {
  return pathname.startsWith("/dashboard")
}

export function isActiveFlooringItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
