"use client"

import type { ReactNode } from "react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

/**
 * Shared style for the small action buttons rendered in a group's
 * `headerRight` slot (e.g. "+ New property", "+ Add job type", the
 * pencil-edit buttons). Lives here so every group's header buttons stay
 * visually locked together.
 */
export const GROUP_HEADER_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center rounded-md border border-[var(--panel-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/30 focus:outline-none focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"

/**
 * Group container for the templates record view. Tab label on the
 * top-left, optional `headerRight` slot on the right, and a bordered
 * card body whose top-left corner butts into the tab so the two read
 * as a single piece of chrome. Mirrors `WorkOrderGroup` and stays
 * module-local rather than crossing into the WO module.
 */
export function TemplateGroup({
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
