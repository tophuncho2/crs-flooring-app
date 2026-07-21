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
  // product and stores its own bid cost. Sent in the diff. Feeds profit/margin.
  bidCost: string
  // Persisted job-costing money columns ("" when unset). `unitPrice` is manual
  // (no product to seed from); tax + freight are manual. All sent in the diff.
  unitPrice: string
  tax: string
  freight: string
  // Derived on read, display only — never sent in the diff. Line total (qty ×
  // unitPrice + tax + freight); lineProfit signed bare money ("-5.00"/"12.00");
  // lineMargin signed one-decimal percent ("28.6"/"−16.7"). "" when blank.
  lineTotal: string
  lineProfit: string
  lineMargin: string
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
  // Job-costing money columns (persisted). "" = unset (stored NULL). bidCost,
  // unitPrice, tax, and freight are all manual entry on a service item.
  bidCost: string
  unitPrice: string
  tax: string
  freight: string
}
