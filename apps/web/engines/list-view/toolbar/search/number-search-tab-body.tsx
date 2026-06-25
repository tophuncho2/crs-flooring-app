"use client"

import { DebouncedSearchControl } from "./debounced-search-control"

export type NumberSearchTabBodyProps = {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  ariaLabel?: string
}

/**
 * Shared body for a list's record-number exact-search, hosted as a tab inside the
 * table's gutter `TableOptions` menu (the `WO #` / `Inv #` / `PROD #` … tab).
 * A single debounced search bar, relocated off the toolbar's per-column card.
 *
 * Pure body — no trigger/popover chrome of its own (the popover + anchoring come
 * from the engine's `AnchoredPanel`, same as `SortMenuBody`). The fixed width
 * keeps every module's number tab identical; `normal-case`/`tracking-normal`
 * reset the surrounding uppercase header styling for the input.
 *
 * `placeholder`/`ariaLabel` are per-module (the row label differs), so callers pass them.
 */
export function NumberSearchTabBody({ value, onChange, placeholder, ariaLabel }: NumberSearchTabBodyProps) {
  return (
    <div className="flex w-[15rem] flex-col normal-case tracking-normal">
      <DebouncedSearchControl
        value={value}
        onCommit={onChange}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
      />
    </div>
  )
}
