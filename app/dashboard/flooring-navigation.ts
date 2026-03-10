import type { ToolSlug } from "@/lib/tool-subscriptions"

export type FlooringNavItem = {
  slug: string
  name: string
  href: string
  requiredTool?: ToolSlug
}

export const FLOORING_NAV_ITEMS: FlooringNavItem[] = [
  { slug: "warehouse", name: "Warehouse", href: "/dashboard/flooring/warehouse", requiredTool: "warehouse" },
  { slug: "products", name: "Products", href: "/dashboard/flooring/products", requiredTool: "products" },
  { slug: "flooring-work-orders", name: "Work Orders", href: "/dashboard/flooring/work-orders", requiredTool: "warehouse" },
  { slug: "flooring-properties", name: "Properties", href: "/dashboard/flooring/properties", requiredTool: "warehouse" },
  {
    slug: "flooring-management-companies",
    name: "Management Companies",
    href: "/dashboard/flooring/management-companies",
    requiredTool: "warehouse",
  },
  { slug: "flooring-templates", name: "Templates", href: "/dashboard/flooring/templates", requiredTool: "warehouse" },
  { slug: "flooring-manufacturers", name: "Manufacturers", href: "/dashboard/flooring/manufacturers", requiredTool: "warehouse" },
]

export const FLOORING_NAV_SLUGS = FLOORING_NAV_ITEMS.map((item) => item.slug)

export function isFlooringRoute(pathname: string) {
  return pathname.startsWith("/dashboard/flooring")
}

export function isActiveFlooringItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
