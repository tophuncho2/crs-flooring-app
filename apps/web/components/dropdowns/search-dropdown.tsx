"use client"

import { useMemo, useState } from "react"
import { SelectDropdown, type SelectDropdownProps } from "./select-dropdown"
import type { DropdownOption } from "./contracts/dropdown-option"

export type SearchDropdownProps = Omit<SelectDropdownProps, "options"> & {
  options: ReadonlyArray<DropdownOption>
  /**
   * Controlled query. If omitted, the component manages its own search state
   * internally. Pass both `query` + `onQueryChange` to lift state.
   */
  query?: string
  onQueryChange?: (query: string) => void
  searchPlaceholder?: string
}

/**
 * Search-enabled wrapper around `SelectDropdown`. Filters options in place by
 * a substring match against `label`. Future hardening (fuzzy match, async
 * load, multi-key search) lands behind the same prop surface.
 *
 * Note: the search input is rendered above the trigger when uncontrolled;
 * future revisions will move it inside the popover for closer parity with
 * keyboard-driven flows.
 */
export function SearchDropdown({
  options,
  query: controlledQuery,
  onQueryChange,
  searchPlaceholder = "Search…",
  ...rest
}: SearchDropdownProps) {
  const [internalQuery, setInternalQuery] = useState("")
  const isControlled = controlledQuery !== undefined
  const query = isControlled ? (controlledQuery as string) : internalQuery

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return options
    return options.filter((option) => option.label.toLowerCase().includes(trimmed))
  }, [options, query])

  function handleQueryChange(next: string) {
    if (isControlled) {
      onQueryChange?.(next)
    } else {
      setInternalQuery(next)
      onQueryChange?.(next)
    }
  }

  return (
    <div className="space-y-1">
      <input
        type="search"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        placeholder={searchPlaceholder}
        className="w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"
      />
      <SelectDropdown {...rest} options={filteredOptions} />
    </div>
  )
}
