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
  { slug: "calendar", name: "Calendar", href: "/dashboard/flooring/calendar", requiredTool: "warehouse" },
  { slug: "flooring-cut-logs", name: "Cut Logs", href: "/dashboard/flooring/cut-logs", requiredTool: "warehouse" },
  { slug: "flooring-inventory", name: "Inventory", href: "/dashboard/flooring/inventory", requiredTool: "warehouse" },
  { slug: "flooring-imports", name: "Imports", href: "/dashboard/flooring/imports", requiredTool: "warehouse" },
  { slug: "flooring-work-orders", name: "Work Orders", href: "/dashboard/flooring/work-orders", requiredTool: "warehouse" },
  { slug: "flooring-properties", name: "Properties", href: "/dashboard/flooring/properties", requiredTool: "warehouse" },
  {
    slug: "flooring-management-companies",
    name: "Management Companies",
    href: "/dashboard/flooring/management-companies",
    requiredTool: "warehouse",
  },
  { slug: "flooring-templates", name: "Templates", href: "/dashboard/flooring/templates", requiredTool: "warehouse" },
  { slug: "flooring-manufacturers", name: "Manufacturers", href: "/dashboard/flooring/manufacturers", requiredTool: "products" },
]

export const FLOORING_NAV_SLUGS = FLOORING_NAV_ITEMS.map((item) => item.slug)

export function orderFlooringNavItems(slugs: string[]) {
  const itemMap = new Map(FLOORING_NAV_ITEMS.map((item) => [item.slug, item]))
  const seen = new Set<string>()
  const ordered = slugs
    .map((slug) => {
      const item = itemMap.get(slug)
      if (!item || seen.has(slug)) return null
      seen.add(slug)
      return item
    })
    .filter((item): item is FlooringNavItem => Boolean(item))

  for (const item of FLOORING_NAV_ITEMS) {
    if (!seen.has(item.slug)) {
      ordered.push(item)
    }
  }

  return ordered
}

export function isFlooringRoute(pathname: string) {
  return pathname.startsWith("/dashboard/flooring")
}

export function isActiveFlooringItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
