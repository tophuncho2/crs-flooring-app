"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { UserToolRow } from "@/lib/tool-subscriptions"
import type { FlooringNavItem } from "./flooring-navigation"
import { isActiveFlooringItem, isFlooringRoute } from "./flooring-navigation"

type FlooringHeaderNavProps = {
  canUseTools: boolean
  tools: UserToolRow[]
  visibleSlugs: string[]
  orderedItems: FlooringNavItem[]
}

export default function FlooringHeaderNav({ canUseTools, tools, visibleSlugs, orderedItems }: FlooringHeaderNavProps) {
  const pathname = usePathname()
  const unlockedToolSet = new Set(tools.filter((tool) => tool.isUnlocked).map((tool) => tool.slug))
  const visibleSlugSet = new Set(visibleSlugs)

  if (!pathname || !isFlooringRoute(pathname) || !canUseTools) {
    return null
  }

  return (
    <nav className="flex max-w-[calc(100vw-11rem)] items-center gap-2 overflow-x-auto rounded-full border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-2 shadow-[0_0_12px_rgba(59,130,246,0.12)]">
      {orderedItems.filter((item) => visibleSlugSet.has(item.slug)).map((item) => {
        const canOpen = canUseTools || (item.requiredTool ? unlockedToolSet.has(item.requiredTool) : false)
        const isActive = isActiveFlooringItem(pathname, item.href)

        if (isActive) {
          return (
            <span
              key={item.slug}
              aria-current="page"
              className="rounded-full bg-slate-500/35 px-3 py-2 text-sm font-medium text-[var(--foreground)]/60"
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
