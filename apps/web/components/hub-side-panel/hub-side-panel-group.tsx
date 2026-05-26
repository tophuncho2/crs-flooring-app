"use client"

import type { ReactNode } from "react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type HubSidePanelGroupProps = {
  title: string
  children: ReactNode
  /** Optional right-aligned slot in the tab header (e.g. a status chip). */
  headerRight?: ReactNode
  className?: string
}

/**
 * Titled group for editable/read-only cells in a hub side panel. A blue tab
 * label sits top-left, an optional `headerRight` slot top-right, and a
 * bordered card body whose top-left corner butts into the tab so the two read
 * as one piece of chrome.
 *
 * Formalizes the module-local `InventoryGroup` / `WorkOrderGroup` /
 * `TemplateGroup` pattern as a shared hub primitive — the inventory hub can
 * adopt this in place of its local copy in a later migration.
 */
export function HubSidePanelGroup({
  title,
  children,
  headerRight,
  className,
}: HubSidePanelGroupProps) {
  return (
    <div className={joinClassNames("flex flex-col", className)}>
      <div className="flex items-end justify-between">
        <span className="inline-block rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
          {title}
        </span>
        {headerRight ? <div className="pb-1">{headerRight}</div> : null}
      </div>
      <div className="rounded-md rounded-tl-none border border-[var(--panel-border)] p-3">
        {children}
      </div>
    </div>
  )
}
