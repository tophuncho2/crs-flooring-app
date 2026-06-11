"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { AnchoredPanel } from "@/engines/picker"
import { RecordFooterNeutralButton } from "./record-action-buttons"

export type RecordOptionsMenuItem = {
  key: string
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
}

const MENU_ITEM_CLASS_NAME =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--foreground)]/80"

/**
 * A neutral "Options" trigger button that opens an anchored menu of action
 * items. Composes the picker engine's {@link AnchoredPanel} for positioning,
 * outside-click, and Escape handling; the trigger reuses the record footer's
 * neutral button so it sits flush beside Save / Discard in a section header.
 *
 * Pure chrome — items are data-injected by the consumer. Clicking an item
 * closes the menu, then fires its `onClick`.
 */
export function RecordOptionsMenu({
  label = "Options",
  items,
  disabled,
}: {
  label?: string
  items: RecordOptionsMenuItem[]
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  const trigger = (
    <RecordFooterNeutralButton
      onClick={() => setOpen((previous) => !previous)}
      disabled={disabled}
      aria-haspopup="menu"
      aria-expanded={open}
    >
      {label}
      <ChevronDown size={16} />
    </RecordFooterNeutralButton>
  )

  return (
    <AnchoredPanel
      trigger={trigger}
      open={open}
      onClose={() => setOpen(false)}
      stickyHeader={
        <span className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]/55">
          {label}
        </span>
      }
    >
      <div className="flex flex-col gap-0.5" role="menu">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              setOpen(false)
              item.onClick()
            }}
            className={MENU_ITEM_CLASS_NAME}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </AnchoredPanel>
  )
}
