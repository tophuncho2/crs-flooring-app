"use client"

import { useEffect, useRef, useState } from "react"
import { SearchControl } from "./search-control"

const DEFAULT_DEBOUNCE_MS = 300

export type DebouncedSearchControlProps = {
  /** The committed value (e.g. from the URL / filter state). */
  value: string
  /** Fired after the debounce window once typing settles. */
  onCommit: (next: string) => void
  placeholder?: string
  ariaLabel?: string
  debounceMs?: number
  className?: string
}

/**
 * A `SearchControl` that keeps its own input state and only commits the value
 * upstream after a debounce window. Use this when the committed value drives a
 * network fetch (e.g. a free-text list filter) and you don't want a request per
 * keystroke. The single list-view search debounces inside the controller; the
 * per-field filter search bars don't get that for free, so they wrap this.
 *
 * `value` is the source of truth: whenever it changes externally (Clear all,
 * back/forward navigation, SSR hydration) the local input resyncs to it.
 */
export function DebouncedSearchControl({
  value,
  onCommit,
  placeholder,
  ariaLabel,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  className,
}: DebouncedSearchControlProps) {
  const [draft, setDraft] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Resync the local draft whenever the committed value changes from outside.
  useEffect(() => {
    setDraft(value)
  }, [value])

  // Clear any pending timer on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = (next: string) => {
    setDraft(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onCommit(next)
    }, debounceMs)
  }

  return (
    <SearchControl
      query={draft}
      onQueryChange={handleChange}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      className={className}
    />
  )
}
