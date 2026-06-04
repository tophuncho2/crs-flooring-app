// Controlled-component contract for a search input. The grid reads this off
// `GridFeatures.search`; standalone consumers can pass it directly to a
// SearchControl. `debounceMs` is reserved — current implementation is
// synchronous; consumers can wire their own debouncing if needed.

export type SearchContract = {
  query: string
  onQueryChange: (query: string) => void
  placeholder?: string
  debounceMs?: number
  ariaLabel?: string
}
