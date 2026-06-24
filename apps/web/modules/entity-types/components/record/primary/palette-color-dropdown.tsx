"use client"

import { useState } from "react"
import {
  AnchoredPanel,
  CellChip,
  PALETTE_COLOR_VALUES,
  PALETTE_LABEL,
} from "@/engines/common"
import type { EntityTypeColor } from "@builders/domain"

// Module-local swatch dropdown for the non-semantic entity-type palette. The
// shared SelectDropdown (picker engine) has no swatch slot, so the palette
// *widget* is built here per the "build module-local where the engine falls
// short" convention. The popover *chrome* (portal, placement/flip, outside-click
// + Escape) is the engine's `AnchoredPanel` — mirrors the products category
// picker. It composes the reused `CellChip` (paletteColor) for the trigger
// preview and each option swatch. Read-only mode renders the static chip.
export type PaletteColorDropdownProps = {
  value: EntityTypeColor
  editable: boolean
  onChange: (value: EntityTypeColor) => void
  ariaLabel?: string
}

export function PaletteColorDropdown({
  value,
  editable,
  onChange,
  ariaLabel,
}: PaletteColorDropdownProps) {
  const [open, setOpen] = useState(false)

  if (!editable) {
    return (
      <span className="flex">
        <CellChip paletteColor={value}>{PALETTE_LABEL[value]}</CellChip>
      </span>
    )
  }

  const trigger = (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={() => setOpen((previous) => !previous)}
      className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-1 text-sm transition hover:border-[var(--foreground)]/30"
    >
      <CellChip paletteColor={value}>{PALETTE_LABEL[value]}</CellChip>
      <span aria-hidden className="text-[var(--foreground)]/50">
        ▾
      </span>
    </button>
  )

  const stickyHeader = (
    <span className="text-xs font-medium text-[var(--foreground)]/60">Color</span>
  )

  return (
    <AnchoredPanel
      trigger={trigger}
      open={open}
      onClose={() => setOpen(false)}
      stickyHeader={stickyHeader}
    >
      <div role="listbox" aria-label={ariaLabel} className="grid grid-cols-2 gap-1">
        {PALETTE_COLOR_VALUES.map((color) => {
          const isActive = color === value
          return (
            <button
              key={color}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => {
                onChange(color)
                setOpen(false)
              }}
              className={`flex items-center rounded px-1 py-0.5 transition hover:bg-[var(--foreground)]/5 ${
                isActive ? "ring-1 ring-[var(--foreground)]/40" : ""
              }`}
            >
              <CellChip paletteColor={color}>{PALETTE_LABEL[color]}</CellChip>
            </button>
          )
        })}
      </div>
    </AnchoredPanel>
  )
}
