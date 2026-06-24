"use client"

import { useEffect, useRef, useState } from "react"
import {
  CellChip,
  PALETTE_COLOR_VALUES,
  PALETTE_LABEL,
} from "@/engines/common"
import type { EntityTypeColor } from "@builders/domain"

// Module-local swatch dropdown for the non-semantic entity-type palette. The
// shared SelectDropdown (picker engine) has no swatch slot, so this is built
// here per the "build module-local where the engine falls short" convention. It
// composes the reused `CellChip` (paletteColor) for both the trigger preview and
// each option swatch. Read-only mode renders the static chip; editable mode opens
// a small popover of color chips.
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
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  if (!editable) {
    return (
      <span className="flex">
        <CellChip paletteColor={value}>{PALETTE_LABEL[value]}</CellChip>
      </span>
    )
  }

  return (
    <div ref={containerRef} className="relative">
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

      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-20 mt-1 grid w-full grid-cols-2 gap-1 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-1 shadow-lg"
        >
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
      ) : null}
    </div>
  )
}
