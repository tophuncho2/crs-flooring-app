"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Building2,
  Circle,
  ClipboardList,
  DollarSign,
  Factory,
  FolderTree,
  Hammer,
  History,
  LayoutTemplate,
  Package,
  PanelLeftOpen,
  Ruler,
  Shapes,
  Slice,
  Tags,
  Upload,
  User,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react"
import { SidePanel } from "./side-panel"
import UserMenu from "./user-menu"
import {
  FLOORING_ACTIVE_NAV_TAB_CLASS_NAME,
  FLOORING_LIST_TINT_PANEL_CLASS_NAME,
} from "@/engines/common"
import {
  FLOORING_NAV_GROUPS,
  FLOORING_NAV_ITEMS,
  NAV_RAIL_WIDTH_CLASS,
  isActiveFlooringItem,
  isFlooringRoute,
} from "@/modules/app-shell/navigation/definitions"

// Placeholder icon set drawn from lucide-react (already a dependency — no new
// packages, deploy-safe). Swap to custom artwork later by editing this map.
const NAV_ICONS: Record<string, LucideIcon> = {
  "flooring-work-orders": ClipboardList,
  "flooring-templates": LayoutTemplate,
  "flooring-properties": Building2,
  "flooring-entities": User,
  "flooring-payments": DollarSign,
  "flooring-adjustments": Slice,
  "flooring-inventory": Tags,
  "flooring-imports": Upload,
  products: Package,
  "flooring-job-types": Hammer,
  "flooring-entity-types": Shapes,
  "flooring-manufacturers": Factory,
  "flooring-warehouse": Warehouse,
  "flooring-unit-of-measures": Ruler,
  "flooring-categories": FolderTree,
  "flooring-users": Users,
  "flooring-user-activity": History,
}

type NavRailProps = {
  email: string
  rank: string
}

export default function NavRail({ email, rank }: NavRailProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.code !== "KeyQ" || !event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || target?.closest("input, textarea, select")) {
        return
      }
      event.preventDefault()
      setOpen((prev) => !prev)
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [])

  if (!pathname || !isFlooringRoute(pathname)) {
    return null
  }

  function handleNavigate(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Persistent icon rail — always visible, every item navigates. */}
      <aside
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--panel-border)] ${FLOORING_LIST_TINT_PANEL_CLASS_NAME} ${NAV_RAIL_WIDTH_CLASS}`}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Expand navigation"
          className="mx-auto mt-2 flex h-10 w-10 items-center justify-center rounded-xl text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)]"
        >
          <PanelLeftOpen size={18} />
        </button>

        <div aria-hidden="true" className="mx-3 my-2 border-t border-[var(--panel-border)]/70" />

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-3">
          {FLOORING_NAV_GROUPS.map((group, groupIndex) => {
            const groupItems = FLOORING_NAV_ITEMS.filter((item) => item.group === group.id)
            if (groupItems.length === 0) return null

            return (
              <div key={group.id} className="flex flex-col gap-1">
                {groupIndex > 0 ? (
                  <div
                    aria-hidden="true"
                    className="mx-3 my-1 border-t border-[var(--panel-border)]/70"
                  />
                ) : null}
                {groupItems.map((item) => {
                  const Icon = NAV_ICONS[item.slug] ?? Circle
                  const isActive = isActiveFlooringItem(pathname, item.href)

                  return (
                    <Link
                      key={item.slug}
                      href={item.href}
                      title={item.name}
                      aria-label={item.name}
                      aria-current={isActive ? "page" : undefined}
                      onClick={(event) => {
                        event.preventDefault()
                        handleNavigate(item.href)
                      }}
                      className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition ${
                        isActive
                          ? "bg-blue-500 text-black shadow-[0_0_12px_rgba(59,130,246,0.18)]"
                          : "text-[var(--foreground)]/70 hover:bg-[var(--panel-hover)]"
                      }`}
                    >
                      <Icon size={20} />
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div aria-hidden="true" className="mx-3 mb-1 border-t border-[var(--panel-border)]/70" />
        <div className="flex justify-center py-2">
          <UserMenu email={email} rank={rank} />
        </div>
      </aside>

      {/* Expanded labeled drawer — opens over the rail on demand. */}
      <SidePanel
        open={open}
        side="left"
        onClose={() => setOpen(false)}
        title="Navigation"
        panelClassName={FLOORING_LIST_TINT_PANEL_CLASS_NAME}
      >
        <nav className="flex flex-col py-2">
          {FLOORING_NAV_GROUPS.map((group, groupIndex) => {
            const groupItems = FLOORING_NAV_ITEMS.filter((item) => item.group === group.id)
            if (groupItems.length === 0) return null

            return (
              <div key={group.id} className="flex flex-col">
                {groupIndex > 0 ? (
                  <div
                    aria-hidden="true"
                    className="mx-4 my-2 border-t border-[var(--panel-border)]/70"
                  />
                ) : null}
                <div className="mx-2 px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]/40">
                  {group.label}
                </div>
                {groupItems.map((item) => {
                  const Icon = NAV_ICONS[item.slug] ?? Circle
                  const isActive = isActiveFlooringItem(pathname, item.href)

                  return (
                    <Link
                      key={item.slug}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={(event) => {
                        event.preventDefault()
                        handleNavigate(item.href)
                      }}
                      className={
                        isActive
                          ? `mx-2 my-1 inline-flex w-fit items-center gap-2 ${FLOORING_ACTIVE_NAV_TAB_CLASS_NAME}`
                          : "mx-2 my-1 flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-hover)]"
                      }
                    >
                      <Icon size={16} />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>
      </SidePanel>
    </>
  )
}
