"use client"

import { useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import { AnchoredPanel } from "@/engines/common"
import type { TableOptionsConfig } from "./contracts/table-options-contract"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

/**
 * Table-header options control. Renders an icon trigger inside the leading
 * open-gutter `<th>` that opens an {@link AnchoredPanel} hosting a tabbed body —
 * the same popover chrome the header filter funnel uses, so the gutter stays
 * consistent. The first tab ("Sort") wraps the list controller's multi-column
 * sort builder; the tab API is open-ended for future controls.
 *
 * Header-only — it lives in the `<th>`, never per row, so it does not widen the
 * row gutter. Pure chrome: each tab owns its body via `tab.render(close)`.
 */
export function TableOptions({ config }: { config: TableOptionsConfig }) {
  const [open, setOpen] = useState(false)
  const [activeTabKey, setActiveTabKey] = useState(config.tabs[0]?.key ?? "")

  const close = () => setOpen(false)

  if (config.tabs.length === 0) return null

  const activeTab = config.tabs.find((tab) => tab.key === activeTabKey) ?? config.tabs[0]
  const hasActive = config.tabs.some((tab) => tab.active)
  const showTabStrip = config.tabs.length > 1

  return (
    <AnchoredPanel
      open={open}
      onClose={close}
      stickyHeader={
        showTabStrip ? (
          <div className="flex items-center gap-1">
            {config.tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTabKey(tab.key)}
                aria-pressed={tab.key === activeTab.key}
                className={joinClassNames(
                  "rounded-md px-2 py-1 text-xs font-semibold transition",
                  tab.key === activeTab.key
                    ? "bg-sky-500/15 text-sky-600"
                    : "text-[var(--foreground)]/60 hover:text-[var(--foreground)]",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/70">
            {activeTab.label}
          </span>
        )
      }
      trigger={
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={config.ariaLabel ?? "Table options"}
          className={joinClassNames(
            "relative inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-semibold uppercase tracking-[0.06em] transition hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
            hasActive ? "text-sky-500" : "opacity-60",
          )}
        >
          <SlidersHorizontal size={14} strokeWidth={2.5} aria-hidden="true" />
          Menu
          {hasActive ? (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-sky-500"
            />
          ) : null}
        </button>
      }
    >
      {activeTab.render(close)}
    </AnchoredPanel>
  )
}
