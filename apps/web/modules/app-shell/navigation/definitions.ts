import type { ToolSlug } from "@/server/platform/tool-access"
import { TEMPLATES_TOOL_SLUG, WORK_ORDERS_TOOL_SLUG } from "@/modules/shared/access/tool-slugs"

export type FlooringNavGroupId = "operations" | "catalog"

export type FlooringNavGroup = {
  id: FlooringNavGroupId
  label: string
}

export const FLOORING_NAV_GROUPS: FlooringNavGroup[] = [
  { id: "operations", label: "Operations" },
  { id: "catalog", label: "Catalog" },
]

export type FlooringNavItem = {
  slug: string
  name: string
  href: string
  requiredTool?: ToolSlug
  group: FlooringNavGroupId
}

export const FLOORING_NAV_ITEMS: FlooringNavItem[] = [
  { slug: "flooring-work-orders", name: "Work Orders", href: "/dashboard/work-orders", requiredTool: WORK_ORDERS_TOOL_SLUG, group: "operations" },
  { slug: "flooring-templates", name: "Templates", href: "/dashboard/templates", requiredTool: TEMPLATES_TOOL_SLUG, group: "operations" },
  { slug: "flooring-properties", name: "Properties", href: "/dashboard/properties", requiredTool: "warehouse", group: "operations" },
  {
    slug: "flooring-management-companies",
    name: "Management Companies",
    href: "/dashboard/management-companies",
    requiredTool: "warehouse",
    group: "operations",
  },
  { slug: "flooring-inventory", name: "Inventory", href: "/dashboard/inventory", requiredTool: "warehouse", group: "catalog" },
  { slug: "flooring-imports", name: "Imports", href: "/dashboard/imports", requiredTool: "warehouse", group: "catalog" },
  { slug: "products", name: "Products", href: "/dashboard/products", requiredTool: "products", group: "catalog" },
  { slug: "flooring-manufacturers", name: "Manufacturers", href: "/dashboard/manufacturers", requiredTool: "products", group: "catalog" },
  { slug: "flooring-warehouse", name: "Warehouse", href: "/dashboard/warehouse", requiredTool: "warehouse", group: "catalog" },
  { slug: "flooring-unit-of-measures", name: "Unit Of Measures", href: "/dashboard/unit-of-measures", requiredTool: "products", group: "catalog" },
  { slug: "flooring-categories", name: "Categories", href: "/dashboard/categories", requiredTool: "products", group: "catalog" },
]

export function isFlooringRoute(pathname: string) {
  return pathname.startsWith("/dashboard")
}

export function isActiveFlooringItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
