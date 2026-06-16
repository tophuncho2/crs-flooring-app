"use client"

import { useState, type ReactNode } from "react"
import { EllipsisVertical } from "lucide-react"
import { AnchoredPanel } from "./anchored-panel"
import { CellActionButton } from "./cell-action-button"

export type RecordOptionsMenuItem = {
  key: string
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
}

/** Render-prop args for a custom trigger; `toggle` flips the open state. */
export type RecordOptionsMenuTrigger = (args: {
  open: boolean
  toggle: () => void
  disabled?: boolean
}) => ReactNode

const MENU_ITEM_CLASS_NAME =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[var(--foreground)]/80"

/**
 * The canonical "record options" (⋮) affordance — the paired sibling of
 * {@link RecordOpenButton}. Both sit on the same surfaces (a list-view row's
 * action gutter, a record-view field cell's `actions` slot); render them
 * together so every row/cell carries a consistent open + options pair.
 *
 * The default trigger is an icon-only {@link CellActionButton} (EllipsisVertical)
 * so it matches the open button pixel-for-pixel. Pass `renderTrigger` for a
 * labeled variant (e.g. a footer "Options ▾" button). The menu itself composes
 * the shared {@link AnchoredPanel} for positioning, outside-click, and Escape.
 *
 * Pure chrome — items are data-injected by the consumer. Clicking an item
 * closes the menu, then fires its `onClick`.
 */
export function RecordOptionsMenu({
  items,
  ariaLabel = "Options",
  heading = "Options",
  disabled,
  renderTrigger,
}: {
  items: RecordOptionsMenuItem[]
  /** Accessible label for the default icon trigger. */
  ariaLabel?: string
  /** Sticky header label above the menu items. */
  heading?: string
  disabled?: boolean
  /** Override the default icon trigger (e.g. a labeled button). */
  renderTrigger?: RecordOptionsMenuTrigger
}) {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen((previous) => !previous)

  const trigger = renderTrigger ? (
    renderTrigger({ open, toggle, disabled })
  ) : (
    <CellActionButton
      onClick={toggle}
      ariaLabel={ariaLabel}
      disabled={disabled}
      icon={<EllipsisVertical size={14} aria-hidden="true" />}
    />
  )

  return (
    <AnchoredPanel
      trigger={trigger}
      open={open}
      onClose={() => setOpen(false)}
      stickyHeader={
        <span className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]/55">
          {heading}
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
