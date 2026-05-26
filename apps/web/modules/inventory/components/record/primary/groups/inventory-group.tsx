"use client"

import type { ReactNode } from "react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

const GROUP_TONE = {
  blue: {
    tab: "border-[var(--panel-border)] bg-blue-500/15",
    body: "border-[var(--panel-border)]",
  },
  red: {
    tab: "border-red-500/30 bg-red-500/15",
    body: "border-red-500/30 bg-red-500/5",
  },
} as const

/**
 * Group container for the inventory record view. Tab label on the
 * top-left, optional `headerRight` slot on the right (e.g. archive
 * chip), and a bordered card body whose top-left corner butts into the
 * tab so the two read as a single piece of chrome. Mirrors
 * `WorkOrderGroup` / `TemplateGroup` and stays module-local rather
 * than crossing into either of those modules.
 *
 * `tone` accents the chrome: `blue` (default) for live inventory cells,
 * `red` for the read-only "Reference inventory" card in the duplicate form.
 */
export function InventoryGroup({
  title,
  children,
  headerRight,
  className,
  tone = "blue",
}: {
  title: string
  children: ReactNode
  headerRight?: ReactNode
  className?: string
  tone?: "blue" | "red"
}) {
  const toneClasses = GROUP_TONE[tone]
  return (
    <div className={joinClassNames("flex flex-col", className)}>
      <div className="flex items-end justify-between">
        <span
          className={joinClassNames(
            "inline-block rounded-t-md border border-b-0 px-3 py-1 text-xs font-bold text-black",
            toneClasses.tab,
          )}
        >
          {title}
        </span>
        {headerRight ? <div className="pb-1">{headerRight}</div> : null}
      </div>
      <div
        className={joinClassNames("rounded-md rounded-tl-none border p-3", toneClasses.body)}
      >
        {children}
      </div>
    </div>
  )
}
