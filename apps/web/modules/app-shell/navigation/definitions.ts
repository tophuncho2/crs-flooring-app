import type { ToolSlug } from "@/server/platform/tool-access"
import { TEMPLATES_TOOL_SLUG, WORK_ORDERS_TOOL_SLUG } from "@/modules/shared/access/tool-slugs"

export type FlooringNavItem = {
  slug: string
  name: string
  href: string
  requiredTool?: ToolSlug
  builderOnly?: boolean
}

export const FLOORING_NAV_ITEMS: FlooringNavItem[] = [
  { slug: "products", name: "Products", href: "/dashboard/products", requiredTool: "products" },
  { slug: "flooring-categories", name: "Categories", href: "/dashboard/categories", requiredTool: "products" },
  { slug: "flooring-inventory", name: "Inventory", href: "/dashboard/inventory", requiredTool: "warehouse" },
  { slug: "flooring-imports", name: "Imports", href: "/dashboard/imports", requiredTool: "warehouse" },
  { slug: "flooring-work-orders", name: "Work Orders", href: "/dashboard/work-orders", requiredTool: WORK_ORDERS_TOOL_SLUG },
  { slug: "flooring-properties", name: "Properties", href: "/dashboard/properties", requiredTool: "warehouse" },
  {
    slug: "flooring-management-companies",
    name: "Management Companies",
    href: "/dashboard/management-companies",
    requiredTool: "warehouse",
  },
  { slug: "flooring-contacts", name: "Contacts", href: "/dashboard/contacts", requiredTool: "warehouse" },
  { slug: "flooring-services", name: "Services", href: "/dashboard/services", requiredTool: "warehouse" },
  { slug: "flooring-templates", name: "Templates", href: "/dashboard/templates", requiredTool: TEMPLATES_TOOL_SLUG },
  { slug: "flooring-manufacturers", name: "Manufacturers", href: "/dashboard/manufacturers", requiredTool: "products" },
  { slug: "flooring-unit-of-measures", name: "Unit Of Measures", href: "/dashboard/unit-of-measures", requiredTool: "products" },
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
  return pathname.startsWith("/dashboard")
}

export function isActiveFlooringItem(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
