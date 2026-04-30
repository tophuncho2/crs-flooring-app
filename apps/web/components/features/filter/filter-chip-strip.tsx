"use client"

import { X } from "lucide-react"
import type { FilterContract, FilterFieldDef } from "./contracts/filter-contract"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

function findOptionLabel(field: FilterFieldDef, value: string): string {
  return field.options.find((option) => option.value === value)?.label ?? value
}

export type FilterChipStripProps = Pick<FilterContract, "fields" | "values" | "onChange" | "onClearAll"> & {
  className?: string
}

/**
 * Inline display of currently-selected filter values. Each chip is
 * `{Field label}: {Option label}` with an X to remove that single value.
 * Optionally renders a "Clear all" trailing chip when `onClearAll` is
 * supplied and at least one filter is active.
 *
 * Pure UI; values + onChange come from the caller (typically the list
 * controller). Renders nothing when no filters are active.
 */
export function FilterChipStrip({
  fields,
  values,
  onChange,
  onClearAll,
  className,
}: FilterChipStripProps) {
  const chips: Array<{ key: string; label: string; remove: () => void }> = []

  for (const field of fields) {
    const selected = values[field.key] ?? []
    for (const value of selected) {
      chips.push({
        key: `${field.key}:${value}`,
        label: `${field.label}: ${findOptionLabel(field, value)}`,
        remove: () => onChange(field.key, selected.filter((entry) => entry !== value)),
      })
    }
  }

  if (chips.length === 0) {
    return null
  }

  return (
    <div className={joinClasses("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/85"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.remove}
            aria-label={`Remove ${chip.label}`}
            className="rounded-full text-[var(--foreground)]/60 hover:text-[var(--foreground)]"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      {onClearAll ? (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Clear all
        </button>
      ) : null}
    </div>
  )
}
