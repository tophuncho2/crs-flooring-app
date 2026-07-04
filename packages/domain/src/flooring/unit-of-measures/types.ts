// Rendered subset for the unit-of-measures list view. The surface shows
// `name` + `createdAt`; `abbreviation` is carried but not currently columned.
export type UnitOfMeasureListRow = {
  id: string
  name: string
  abbreviation: string
  createdAt: string
}

// Picker option shape. Pickers render the name only (per the UoM rendering
// matrix), but the option carries `abbreviation` too so grid/create cells can
// refresh their inline abbrev suffix when the user picks a new unit.
export type UnitOfMeasureOption = {
  id: string
  name: string
  abbreviation: string
}

// Read-only record-view detail. UoM is a seed-sourced reference table (no user
// CRUD yet), so the detail carries no actor columns — name + abbreviation +
// timestamps. Timestamps are ISO strings (normalized in the data layer).
export type UnitOfMeasure = {
  id: string
  name: string
  abbreviation: string
  createdAt: string
  updatedAt: string
}

// Usage counts shown on the UoM detail (read-only). The unit is referenced by
// eight FK relations; the detail surfaces the two most meaningful plus a total
// across all of them. The future delete-guard will count the same relations.
export type UnitOfMeasureStats = {
  productsCount: number
  inventoriesCount: number
  totalUsage: number
}
