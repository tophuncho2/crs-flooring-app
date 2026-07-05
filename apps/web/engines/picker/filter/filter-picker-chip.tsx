"use client"

import type { ReactNode } from "react"

/**
 * The picker-facing props a filter chip resolves for its caller. The chip
 * derives the filter copy strings once (so every list toolbar reads the same),
 * and threads through the value + label wiring the caller feeds in.
 */
export type FilterPickerChrome<TOption> = {
  value: string | null
  selectedLabel: string | null
  onChange: (id: string | null) => void
  onOptionSelected: (option: TOption | null) => void
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  clearLabel: string
  ariaLabel: string
}

export type FilterPickerChipProps<TOption extends { id: string }> = {
  value: string | null
  onChange: (id: string | null) => void
  /** Resolved label for the current value — from the caller's `usePickedOptionLabel`. */
  selectedLabel: string | null
  /** Picked-option capture — from the caller's `usePickedOptionLabel`. */
  onOptionSelected: (option: TOption | null) => void
  /** Singular noun, capitalized — drives the placeholder + aria label (e.g. "Warehouse"). */
  nounSingular: string
  /** Plural noun, lowercase — drives search/empty copy (e.g. "warehouses", "categories"). */
  nounPlural: string
  /** The list subject for the aria label (e.g. "work orders", "inventory"). */
  subject: string
  /** Optional placeholder override; defaults to `nounSingular`. */
  placeholder?: string
  /** Renders the concrete module picker with the resolved chrome (plus any scope props). */
  children: (chrome: FilterPickerChrome<TOption>) => ReactNode
}

/**
 * The one shared toolbar filter chip. It owns the filter copy conventions —
 * `Search <plural>` / `No <plural> match` / `Filter <subject> by <noun>` /
 * `Clear filter` — and hands the resolved props to a render callback that
 * supplies the concrete picker (EntityTypePicker, WarehousePicker, …) with its
 * own scope props and `initialOptions`.
 *
 * The chip deliberately does NOT hold the picked-label state
 * (`usePickedOptionLabel`): filter chips mount inside the Filter popover body,
 * which unmounts on close, so that state must live in the always-mounted list
 * client and be passed in via `selectedLabel` + `onOptionSelected`.
 */
export function FilterPickerChip<TOption extends { id: string }>({
  value,
  onChange,
  selectedLabel,
  onOptionSelected,
  nounSingular,
  nounPlural,
  subject,
  placeholder,
  children,
}: FilterPickerChipProps<TOption>) {
  return children({
    value,
    selectedLabel,
    onChange,
    onOptionSelected,
    placeholder: placeholder ?? nounSingular,
    searchPlaceholder: `Search ${nounPlural}`,
    emptyMessage: `No ${nounPlural} match`,
    clearLabel: "Clear filter",
    ariaLabel: `Filter ${subject} by ${nounSingular.toLowerCase()}`,
  })
}
