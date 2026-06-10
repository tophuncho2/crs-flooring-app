"use client"

import { useEffect, useRef, useState } from "react"
import { MoneyCell } from "@/engines/record-view"

const COST_COMMIT_DEBOUNCE_MS = 300

export type LaborPaymentsCostSearchProps = {
  /** Committed cost filter value (canonical `X.XX` or ""). */
  value: string
  /** Fires the committed value up to the list filter. */
  onCommit: (next: string) => void
}

/**
 * Cost search bar for the labor-payments toolbar. Reuses the record-view
 * `MoneyCell` so the typing UX matches the cost column exactly: digits + one
 * decimal, capped to 2 places (`sanitizeDecimal`), `$` prefix, and
 * `normalizeMoneyAmount` on blur. The sanitized value commits to the list's
 * `cost` filter on a short debounce; blur normalizes then commits the canonical
 * amount. The backend matches `cost` exactly.
 */
export function LaborPaymentsCostSearch({ value, onCommit }: LaborPaymentsCostSearchProps) {
  const [input, setInput] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep local input in sync when the committed value changes externally
  // (e.g. Clear-All resets the filter map).
  useEffect(() => {
    setInput(value)
  }, [value])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = (next: string) => {
    setInput(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onCommit(next)
    }, COST_COMMIT_DEBOUNCE_MS)
  }

  return (
    <MoneyCell
      editable
      value={input}
      onChange={handleChange}
      align="start"
      ariaLabel="Search by cost"
      placeholder="Search by cost"
    />
  )
}
