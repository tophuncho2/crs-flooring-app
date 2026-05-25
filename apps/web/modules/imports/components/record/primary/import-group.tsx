"use client"

import type { ReactNode } from "react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

/**
 * Group container for the imports record view. Tab label on the top-left
 * and a bordered card body whose top-left corner butts into the tab so the
 * two read as a single piece of chrome. Mirrors the work-orders record-view
 * group (`work-order-group.tsx`); kept module-local rather than shared,
 * matching that precedent.
 */
export function ImportGroup({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={joinClassNames("flex flex-col", className)}>
      <div className="flex items-end justify-between">
        <span className="inline-block rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
          {title}
        </span>
      </div>
      <div className="rounded-md rounded-tl-none border border-[var(--panel-border)] p-3">
        {children}
      </div>
    </div>
  )
}
