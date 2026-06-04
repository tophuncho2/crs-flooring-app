// Controlled-component contract for sort. `sortKey` matches a column's `key`;
// `direction` is the standard asc/desc toggle. The grid does not enforce that
// `sortKey` matches a sortable column — that's the consumer's responsibility.

export type SortDirection = "asc" | "desc"

export type SortContract = {
  sortKey: string | null
  direction: SortDirection
  onChange: (next: { sortKey: string | null; direction: SortDirection }) => void
}
