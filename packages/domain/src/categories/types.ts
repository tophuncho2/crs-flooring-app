export type CategoryMeta = {
  id: string
  name: string
}

// Slim option shape consumed by the canonical CategoryPicker (server-side
// search). Name-only — the picker renders no subtitle line.
export type CategoryOption = {
  id: string
  name: string
}

// Rendered subset for the categories list view. Category no longer carries a
// unit (units moved to per-row FKs in the UoM epic) — the surface is name-only.
export type CategoryListRow = {
  id: string
  name: string
}

// Read-only record-view detail. Category is a seed-sourced reference table (no
// user CRUD yet), so the detail carries no actor columns — just name +
// timestamps. Timestamps are ISO strings (normalized in the data layer).
export type Category = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

// Linked-row counts shown on the category detail (read-only). Products are the
// sole referrer today; the future delete-guard will reuse this count.
export type CategoryStats = {
  productsCount: number
}
