export * from "./contracts/paginate-contract"
// PaginateControls is intentionally NOT re-exported: the only sanctioned way to
// render a paginated footer is to hand the list-view DataTable a PaginateContract
// (it owns the always-on footer internally). Keeping the component off the public
// barrel prevents a module from hand-rendering a footer and re-opening the
// per-module divergence the pagination sweep closed. Engine-internal consumers
// (DataTable) import it via relative path; the engine test does the same.
