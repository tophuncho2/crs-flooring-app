"use client"

import { useState } from "react"
import { Copy, EllipsisVertical } from "lucide-react"
import { CellActionButton } from "@/engines/common"
import { AnchoredPanel } from "@/engines/picker"

const MENU_ITEM_CLASS_NAME =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"

/**
 * Per-row options (⋮) menu for the inventory list table, dropped into the
 * `DataTable` action gutter beside the open button. An icon-only
 * {@link CellActionButton} trigger opens the picker engine's
 * {@link AnchoredPanel} (positioning, outside-click, Escape); the menu holds the
 * row actions — today just **Duplicate**, which seeds + opens the inventory
 * create form from this row.
 *
 * Mirrors the record-view engine's `RecordOptionsMenu`, but icon-only: that
 * one's trigger is a labeled record-footer button, which is the wrong fit for a
 * table gutter — so this stays module-local.
 */
export function InventoryRowOptionsMenu({
  onDuplicate,
  ariaLabel,
}: {
  onDuplicate: () => void
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)

  const trigger = (
    <CellActionButton
      onClick={() => setOpen((previous) => !previous)}
      ariaLabel={ariaLabel}
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
          Options
        </span>
      }
    >
      <div className="flex flex-col gap-0.5" role="menu">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false)
            onDuplicate()
          }}
          className={MENU_ITEM_CLASS_NAME}
        >
          <Copy size={14} aria-hidden="true" />
          Duplicate
        </button>
      </div>
    </AnchoredPanel>
  )
}
