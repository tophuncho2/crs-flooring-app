export type CategoryMeta = {
  id: string
  slug: string
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
