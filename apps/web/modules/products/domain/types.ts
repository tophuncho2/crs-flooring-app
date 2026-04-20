import type { InventoryRow } from "@/modules/inventory/domain/types"

export type CategoryOption = {
  id: string
  name: string
  sendUnit: string
  stockUnit: string
  coverageAvailableUnit: string
  itemCoverageUnit: string
}

export type ManufacturerOption = {
  id: string
  name: string
  website: string
  phone: string
  email: string
}

export type ProductRow = {
  id: string
  name: string
  categoryId: string
  manufacturerId: string
  manufacturerName: string
  style: string
  color: string
  width: string
  sheetSize: string
  thickness: string
  unitWeight: string
  coveragePerUnit: string
  coverageUnit: string
  notes: string
  createdAt: string
  updatedAt: string
  category: {
    id: string
    name: string
    sendUnit: string
    stockUnit: string
    coverageAvailableUnit: string
    itemCoverageUnit: string
  }
}

export type ProductForm = {
  categoryId: string
  manufacturerId: string
  style: string
  color: string
  width: string
  sheetSize: string
  thickness: string
  unitWeight: string
  coveragePerUnit: string
  notes: string
}

export type ProductInventoryRow = InventoryRow

export const EMPTY_PRODUCT_FORM: ProductForm = {
  categoryId: "",
  manufacturerId: "",
  style: "",
  color: "",
  width: "",
  sheetSize: "",
  thickness: "",
  unitWeight: "",
  coveragePerUnit: "",
  notes: "",
}

export function toProductForm(product: ProductRow): ProductForm {
  return {
    categoryId: product.categoryId,
    manufacturerId: product.manufacturerId,
    style: product.style,
    color: product.color,
    width: product.width,
    sheetSize: product.sheetSize,
    thickness: product.thickness,
    unitWeight: product.unitWeight,
    coveragePerUnit: product.coveragePerUnit,
    notes: product.notes,
  }
}

export function validateProductPrimaryForm(input: ProductForm) {
  if (!input.categoryId.trim()) {
    return "Category is required"
  }

  if (input.coveragePerUnit.trim() && !/^\d+(\.\d{0,4})?$/.test(input.coveragePerUnit.trim())) {
    return "Coverage per unit must be numeric with up to 4 decimals"
  }

  return ""
}
