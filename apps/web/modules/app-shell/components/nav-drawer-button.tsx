"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu } from "lucide-react"
import { SidePanel } from "@/components/nav"
import { FLOORING_ACTIVE_NAV_TAB_CLASS_NAME } from "@/modules/shared/engines/common/display/accent-styles"
import {
  isActiveFlooringItem,
  isFlooringRoute,
  type FlooringNavItem,
} from "@/modules/app-shell/navigation/definitions"

type NavDrawerButtonProps = {
  canUseTools: boolean
  hasAdminPanelAccess: boolean
  orderedItems: FlooringNavItem[]
  visibleSlugSet: Set<string>
  canOpenItem: (item: FlooringNavItem) => boolean
}

export default function NavDrawerButton({
  canUseTools,
  hasAdminPanelAccess,
  orderedItems,
  visibleSlugSet,
  canOpenItem,
}: NavDrawerButtonProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  if (!pathname || !isFlooringRoute(pathname) || (!canUseTools && !hasAdminPanelAccess)) {
    return null
  }

  const visibleItems = orderedItems.filter((item) => visibleSlugSet.has(item.slug))

  function handleNavigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="
          w-10 h-10 rounded-full
          bg-[var(--panel-background)]
          border border-[var(--panel-border)]
          flex items-center justify-center
          hover:bg-[var(--panel-hover)]
          transition
          shadow-[0_0_6px_rgba(59,130,246,0.25)]
        "
      >
        <Menu size={18} className="text-blue-500" />
      </button>

      <SidePanel open={open} side="left" onClose={() => setOpen(false)} title="Navigation">
        <nav className="flex flex-col py-2">
          {visibleItems.map((item) => {
            const canOpen = canOpenItem(item)
            const isActive = isActiveFlooringItem(pathname, item.href)

            if (isActive) {
              return (
                <span
                  key={item.slug}
                  aria-current="page"
                  className={`mx-2 my-1 inline-flex w-fit ${FLOORING_ACTIVE_NAV_TAB_CLASS_NAME}`}
                >
                  {item.name}
                </span>
              )
            }

            if (!canOpen) {
              return (
                <span
                  key={item.slug}
                  className="mx-2 my-1 cursor-not-allowed rounded-full px-3 py-2 text-sm font-medium text-[var(--foreground)]/35"
                >
                  {item.name}
                </span>
              )
            }

            return (
              <Link
                key={item.slug}
                href={item.href}
                onClick={(event) => {
                  event.preventDefault()
                  handleNavigate(item.href)
                }}
                className="mx-2 my-1 rounded-full px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-hover)]"
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </SidePanel>
    </>
  )
}
