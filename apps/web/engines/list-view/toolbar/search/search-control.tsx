"use client"

import { useId } from "react"
import type { SearchContract } from "./contracts/search-contract"

const INPUT_BASE_CLASS_NAME =
  "w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40"

export type SearchControlProps = SearchContract & {
  className?: string
}

/**
 * Controlled search input. Emits every keystroke through `onQueryChange` —
 * `debounceMs` is reserved on the contract; consumers can wrap with a
 * debounce hook if they need it.
 *
 * Anti-autofill: Chrome ignores `autocomplete="off"` once it classifies a
 * page as an address form (e.g. side panels with street/city/state/postal
 * fields), and sprays its address profile into every nearby text input —
 * including this search bar. We defeat that by giving the input a unique
 * `name` (via `useId`) so Chrome's pattern matcher can't classify it, and
 * by setting `data-form-type="other"`.
 */
export function SearchControl({
  query,
  onQueryChange,
  placeholder = "Search…",
  ariaLabel,
  className,
}: SearchControlProps) {
  const uniqueName = `search-${useId()}`
  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <input
        type="search"
        name={uniqueName}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        data-form-type="other"
        data-1p-ignore
        data-lpignore="true"
        aria-autocomplete="none"
        aria-label={ariaLabel ?? placeholder}
        className={INPUT_BASE_CLASS_NAME}
      />
      {query ? (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-[var(--foreground)]/55 hover:text-[var(--foreground)]"
        >
          ×
        </button>
      ) : null}
    </div>
  )
}
