export type TemplateServiceItemRow = {
  id: string
  // Free-text classification + label (no enum yet — mirrors the WO
  // involvementType precedent). "" when unset.
  itemType: string
  itemName: string
  quantity: string
  // Editable unit FK (UoM epic 2C) — freely editable; sent in the diff. "" when
  // no unit linked. `unitName`/`unitAbbrev` derive from the item's own unit join.
  unitId: string
  unitName: string
  unitAbbrev: string
  // MANUAL persisted bid cost (money string; "" = unset). Unlike planned products
  // — where bid cost is a live `product.cost` read-join — a service item has no
  // product and stores its own bid cost. Sent in the diff. It is the per-unit
  // basis for the line total.
  bidCost: string
  // Persisted job-costing money columns ("" when unset). tax + freight are manual.
  // Both sent in the diff.
  tax: string
  freight: string
  // Derived on read, display only — never sent in the diff. Line total (qty ×
  // bidCost + tax + freight, where bidCost is the manual column). "" when blank.
  lineTotal: string
  createdAt: string
  updatedAt: string
  // Actor-email snapshots stamped on item write (createdBy+updatedBy on add,
  // updatedBy on edit). Null on historical rows. DB-only — not surfaced in the table.
  createdBy: string | null
  updatedBy: string | null
}

export type TemplateServiceItemForm = {
  itemType: string
  itemName: string
  quantity: string
  // Editable unit FK (UoM epic 2C). "" disconnects the unit.
  unitId: string
  // Job-costing money columns (persisted). "" = unset (stored NULL). bidCost, tax,
  // and freight are all manual entry on a service item.
  bidCost: string
  tax: string
  freight: string
}
