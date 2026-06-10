"use client"

import { useEffect, useState } from "react"
import { normalizeAddressState } from "@builders/domain"
import { SearchControl } from "./search-control"

export type StateSearchControlProps = {
  /** Committed 2-letter state code, or null when no state filter is active. */
  value: string | null
  /** Fires the committed code (exactly 2 chars) or null when below 2 chars. */
  onChange: (value: string | null) => void
  placeholder?: string
  ariaLabel?: string
  className?: string
}

/**
 * The canonical list-view state filter input — a text search bar that replaces
 * the old async state picker. Reuses the shared `normalizeAddressState`
 * primitive (strip non-alpha, uppercase, cap at 2 chars), so the echoed
 * `query` is always already normalized — no `maxLength` needed on the input.
 * Commits the filter only at exactly 2 chars; below that it clears it.
 */
export function StateSearchControl({
  value,
  onChange,
  placeholder = "Search state",
  ariaLabel,
  className,
}: StateSearchControlProps) {
  const [text, setText] = useState(value ?? "")

  // Honor external resets (e.g. "Clear all"). Sync only on `value` changes —
  // never on `text` — so an in-progress single char isn't wiped before it
  // reaches 2 (and so the commit round-trip can't race the local echo).
  useEffect(() => {
    const committed = text.length === 2 ? text : null
    if (value !== committed) setText(value ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <SearchControl
      query={text}
      onQueryChange={(raw) => {
        const next = normalizeAddressState(raw)
        setText(next)
        onChange(next.length === 2 ? next : null)
      }}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      className={className}
    />
  )
}
