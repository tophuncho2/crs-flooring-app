export type TemplatePlannedProductRow = {
  id: string
  productId: string
  productName: string
  /** The product's category name, for the combined product/category picker. */
  categoryName: string
  quantity: string
  // Editable unit FK (UoM epic 2C) — seeded from the product on select, then
  // freely editable; sent in the diff. "" when the item has no unit linked yet.
  unitId: string
  // Unit display derives solely from the item's own unit FK join; the frozen
  // snapshot columns that once backed this were dropped in the UoM epic.
  unitName: string
  unitAbbrev: string
  notes: string
  // LIVE cost read-joined off the linked product (`product.cost`), NOT stored on
  // this row. Canonical money string ("10.00"); "" when the product has no cost.
  // Display only — never sent in the diff (like productName). This is the "bid
  // cost".
  productCost: string
  // Job-costing money columns (persisted). Canonical money strings ("" when
  // unset). `unitPrice` seeds from the product on select, then editable; tax +
  // freight are manual entry. All three are sent in the diff.
  unitPrice: string
  tax: string
  freight: string
  // Derived line total (qty × unitPrice + tax + freight), computed on read via
  // computeTemplatePlannedProductLineTotal. Display only — never sent in the diff.
  // "" when all inputs are blank.
  lineTotal: string
  // Derived job-costing metrics, computed on read (bidCost = productCost). Display
  // only — never sent in the diff. lineProfit is a signed bare money string
  // ("-5.00" / "12.00"); lineMargin is a signed one-decimal percent ("28.6" /
  // "−16.7"). Both "" when blank (margin also "" when the line total is zero).
  lineProfit: string
  lineMargin: string
  createdAt: string
  updatedAt: string
  // Actor-email snapshots stamped on item write (createdBy + updatedBy on add,
  // updatedBy on edit). Null on historical rows. Carried on the row but not
  // surfaced in the section table — DB-only by design.
  createdBy: string | null
  updatedBy: string | null
}

export type TemplatePlannedProductForm = {
  productId: string
  // Editable unit FK (UoM epic 2C). "" disconnects the unit.
  unitId: string
  quantity: string
  // Job-costing money columns (persisted). "" = unset (stored NULL). `unitPrice`
  // is seeded from the product but stays editable; tax + freight are manual.
  unitPrice: string
  tax: string
  freight: string
  notes: string
}
