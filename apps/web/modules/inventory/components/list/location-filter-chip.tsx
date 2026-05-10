"use client"

import { useEffect, useState } from "react"

export type LocationFilterChipProps = {
  value: string
  onChange: (next: string) => void
}

/**
 * Inventory list-view chip — free-text "contains" filter on
 * `inventory.location`. Independent from the search bar (which targets
 * `inventoryItem`); useful when narrowing by storage spot without typing
 * the whole composed identifier.
 *
 * Local state debounces commits so the URL doesn't churn on every keystroke;
 * commit fires on blur or after a short idle. Empty value clears the filter.
 */
export function LocationFilterChip({ value, onChange }: LocationFilterChipProps) {
  const [local, setLocal] = useState(value)

  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => {
    if (local === value) return
    const timeout = window.setTimeout(() => {
      onChange(local)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [local, value, onChange])

  return (
    <div className="min-w-[12rem] max-w-[16rem]">
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== value) onChange(local)
        }}
        placeholder="Filter by location"
        aria-label="Filter inventory by location"
        className="w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
      />
    </div>
  )
}
