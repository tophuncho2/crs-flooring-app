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
