"use client"

import type { ReactNode } from "react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

/**
 * Group container for the products record view. Tab label on the
 * top-left, optional `headerRight` slot on the right, and a bordered
 * card body whose top-left corner butts into the tab so the two read
 * as a single piece of chrome. Mirrors `InventoryGroup` /
 * `WorkOrderGroup` / `TemplateGroup` and stays module-local.
 */
export function ProductGroup({
  title,
  children,
  headerRight,
  className,
}: {
  title: string
  children: ReactNode
  headerRight?: ReactNode
  className?: string
}) {
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
