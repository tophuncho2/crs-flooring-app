export type TemplateMaterialItemRow = {
  id: string
  productId: string
  productName: string
  quantity: string
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
