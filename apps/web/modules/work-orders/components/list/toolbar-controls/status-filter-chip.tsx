"use client"

import { useEffect, useRef, useState } from "react"
import type { WorkOrderStatusOption } from "@builders/domain"

export type StatusFilterChipProps = {
  options: WorkOrderStatusOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

// Matches the picker dropdown triggers (rich-dropdown) so toolbar chips align.
const TRIGGER_CLASS_NAME =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-left text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"

function toggleValueIn(values: string[], value: string): string[] {
  const set = new Set(values)
  if (set.has(value)) set.delete(value)
  else set.add(value)
  return Array.from(set)
}

/**
 * Work-order list-view chip — multi-select filter on work-order status. Options
 * come from the seeded status lookup table (server-ordered none→complete), so a
 * newly-seeded status appears here automatically. Selecting toggles its id in
 * the `statusId` filter array.
 */
export function StatusFilterChip({ options, selectedIds, onChange }: StatusFilterChipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isActive = selectedIds.length > 0

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Filter work orders by status${isActive ? `, ${selectedIds.length} selected` : ""}`}
        className={TRIGGER_CLASS_NAME}
      >
        <span className="min-w-0 flex-1 truncate">
          Status{isActive ? ` (${selectedIds.length})` : ""}
        </span>
        <span aria-hidden="true" className="shrink-0 text-[var(--foreground)]/60">
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Status filter"
          className="absolute z-20 mt-1 max-h-80 w-[15rem] overflow-auto rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-1 shadow-lg"
        >
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-[var(--foreground)]/60">No statuses</p>
          ) : (
            options.map((option) => {
              const checked = selectedIds.includes(option.id)
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--foreground)] transition hover:bg-[var(--panel-border)]/30"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange(toggleValueIn(selectedIds, option.id))}
                    className="h-4 w-4 accent-amber-600"
                  />
                  <span className="truncate">{option.name}</span>
                </label>
              )
            })
          )}
          {isActive ? (
            <div className="mt-1 flex justify-end border-t border-[var(--panel-border)] pt-1">
              <button
                type="button"
                onClick={() => onChange([])}
                className="rounded-md px-2.5 py-1 text-xs text-[var(--foreground)]/70 transition hover:text-[var(--foreground)]"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
