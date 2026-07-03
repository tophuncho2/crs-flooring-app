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
}

export const EMPTY_TEMPLATE_PLANNED_PRODUCT_FORM: TemplatePlannedProductForm = {
  productId: "",
  unitId: "",
  quantity: "",
  notes: "",
}
