export * from "./contracts/paginate-contract"
// PaginateControls / CursorPaginateControls are intentionally NOT re-exported:
// the only sanctioned way to render a paginated footer is to hand the list-view
// DataTable a PaginateContract (counted) or CursorPaginateContract (hasMore) —
// it owns the always-on footer internally. Keeping the components off the public
// barrel prevents a module from hand-rendering a footer and re-opening the
// per-module divergence the pagination sweep closed. Engine-internal consumers
// (DataTable) import them via relative path; the engine test does the same.
