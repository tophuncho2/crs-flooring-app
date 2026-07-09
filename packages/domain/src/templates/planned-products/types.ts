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
  // Display + subtotal input only — never sent in the diff (like productName).
  productCost: string
  // Estimated gross-profit margin percent ("30.00"; "" = unset). The only stored
  // pricing input; sent in the diff. Negative = loss.
  estimatedGrossProfitMargin: string
  // Derived: quantity × productCost ÷ (1 − margin/100), canonical money string
  // ("" when uncomputable). NOT stored, NOT in the diff — recomputed on read and
  // in the draft; editing it back-solves the margin.
  subtotal: string
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
  notes: string
  // Estimated gross-profit margin percent; "" = unset. Normalized at the write
  // boundaries. The only new persisted field (cost + subtotal are not stored).
  estimatedGrossProfitMargin: string
}

export const EMPTY_TEMPLATE_PLANNED_PRODUCT_FORM: TemplatePlannedProductForm = {
  productId: "",
  unitId: "",
  quantity: "",
  notes: "",
  estimatedGrossProfitMargin: "",
}
