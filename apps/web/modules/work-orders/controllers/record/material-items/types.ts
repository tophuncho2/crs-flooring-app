export type WorkOrderMaterialItemLocal = {
  id: string
  productId: string
  // Display-only snapshots seeded from the saved row's joined fields and
  // refreshed when the user picks a new product (via ProductPicker's
  // onOptionSelected). Never sent in the diff — server re-normalizes
  // from the live product table on save.
  productName: string
  // Editable unit FK (UoM epic 2C) — seeded from the product on select, then
  // freely editable; sent in the diff. `unitName` feeds the picker's trigger
  // label (selectedLabel), `unitAbbrev` the quantity-cell suffix.
  unitId: string
  unitName: string
  unitAbbrev: string
  quantity: string
  notes: string
  // Client-only — narrows the row's product picker to a chosen category.
  // Excluded from the diff sent on save.
  categoryFilterId: string | null
}

export type WorkOrderMaterialItemsLocalState = {
  items: WorkOrderMaterialItemLocal[]
}
