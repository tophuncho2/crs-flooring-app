"use client"

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
 */
export function SearchControl({
  query,
  onQueryChange,
  placeholder = "Search…",
  ariaLabel,
  className,
}: SearchControlProps) {
  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
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
