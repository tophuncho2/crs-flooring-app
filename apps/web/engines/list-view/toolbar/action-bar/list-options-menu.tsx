"use client"

import Link from "next/link"
import { Settings } from "lucide-react"
import { ToolbarMenuButton } from "./toolbar-menu-button"

export type ListOptionsMenuItem = {
  /** Navigation target for the item (a dashboard route). */
  href: string
  /** Visible item label. */
  label: string
}

const ITEM_CLASS_NAME =
  "block rounded-md px-3 py-2 text-sm text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"

/**
 * The list action-bar "Options" tool — a {@link ToolbarMenuButton} (Settings
 * icon) whose body is a short list of navigation links to a module's management
 * / lookup pages. This is how a lookup table (e.g. Work Order Document Types,
 * Entity Types, Payment Purposes) is reached off the nav rail: it lives behind
 * its parent list's Options menu instead.
 *
 * Pure chrome — the items (href + label) are data-injected by the consumer, so
 * the engine never reaches into a module. Routing/access control stays with the
 * target page's own route guard.
 */
export function ListOptionsMenu({
  items,
  label = "Options",
}: {
  items: ListOptionsMenuItem[]
  /** Trigger label; defaults to "Options". */
  label?: string
}) {
  return (
    <ToolbarMenuButton label={label} icon={Settings}>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={ITEM_CLASS_NAME}>
            {item.label}
          </Link>
        ))}
      </div>
    </ToolbarMenuButton>
  )
}
