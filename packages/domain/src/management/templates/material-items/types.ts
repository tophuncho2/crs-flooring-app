export type TemplateMaterialItemRow = {
  id: string
  productId: string
  productName: string
  /** The product's category name, for the combined product/category picker. */
  categoryName: string
  quantity: string
  // Send-unit snapshot stamped at item write from the chosen product. Empty
  // string when the product's category has no send unit configured.
  sendUnitName: string
  sendUnitAbbrev: string
  notes: string
  createdAt: string
}

export type TemplateMaterialItemForm = {
  productId: string
  quantity: string
  notes: string
}

export const EMPTY_TEMPLATE_MATERIAL_ITEM_FORM: TemplateMaterialItemForm = {
  productId: "",
  quantity: "",
  notes: "",
}
