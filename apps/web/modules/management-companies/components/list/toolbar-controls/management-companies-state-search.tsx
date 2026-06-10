"use client"

import { useEffect, useState } from "react"
import { SearchControl } from "@/engines/list-view"
import { normalizeAddressState } from "@builders/domain"

export type ManagementCompaniesStateSearchProps = {
  value: string | null
  onChange: (value: string | null) => void
}

/**
 * State search bar — the text-input replacement for the retired state picker.
 * Reuses the shared `normalizeAddressState` primitive (strip non-alpha,
 * uppercase, cap at 2 chars), so the echoed `query` is always already
 * normalized — no `maxLength` needed on the underlying input. Commits the
 * `state` filter only at exactly 2 chars; below that it clears it.
 */
export function ManagementCompaniesStateSearch({
  value,
  onChange,
}: ManagementCompaniesStateSearchProps) {
  const [text, setText] = useState(value ?? "")

  // Honor external resets (e.g. "Clear all"). Only re-sync when the committed
  // form of the local text diverges from the incoming value, so typing a
  // single in-progress char isn't wiped before it reaches 2.
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
      placeholder="Search state"
      ariaLabel="Filter management companies by state"
    />
  )
}
