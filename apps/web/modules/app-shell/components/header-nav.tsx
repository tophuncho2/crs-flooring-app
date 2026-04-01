"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FLOORING_ACTIVE_NAV_TAB_CLASS_NAME } from "@/modules/shared/engines/common/display/accent-styles"
import type { FlooringNavItem } from "@/modules/app-shell/navigation/definitions"
import { isActiveFlooringItem, isFlooringRoute } from "@/modules/app-shell/navigation/definitions"

type FlooringHeaderNavProps = {
  canUseTools: boolean
  hasBuilderPanelAccess: boolean
  orderedItems: FlooringNavItem[]
  visibleSlugSet: Set<string>
  canOpenItem: (item: FlooringNavItem) => boolean
}

export default function FlooringHeaderNav({
  canUseTools,
  hasBuilderPanelAccess,
  orderedItems,
  visibleSlugSet,
  canOpenItem,
}: FlooringHeaderNavProps) {
  const pathname = usePathname()

  if (!pathname || !isFlooringRoute(pathname) || (!canUseTools && !hasBuilderPanelAccess)) {
    return null
  }

  return (
    <nav className="flex w-fit max-w-full items-center gap-2 overflow-x-auto rounded-full border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-2 shadow-[0_0_12px_rgba(59,130,246,0.12)]">
      {orderedItems.filter((item) => visibleSlugSet.has(item.slug)).map((item) => {
        const canOpen = canOpenItem(item)
        const isActive = isActiveFlooringItem(pathname, item.href)

        if (isActive) {
          return (
            <span
              key={item.slug}
              aria-current="page"
              className={FLOORING_ACTIVE_NAV_TAB_CLASS_NAME}
            >
              {item.name}
            </span>
          )
        }

        if (!canOpen) {
          return (
            <span
              key={item.slug}
              className="cursor-not-allowed rounded-full px-3 py-2 text-sm font-medium text-[var(--foreground)]/35"
            >
              {item.name}
            </span>
          )
        }

        return (
          <Link
            key={item.slug}
            href={item.href}
            className="rounded-full px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-hover)]"
          >
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
