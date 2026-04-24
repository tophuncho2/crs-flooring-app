// Canonical domain types for products. Mirrors ProductRecord / ProductDetailRecord
// over in @builders/db; kept in the domain package because it is the business-facing
// contract consumed by use cases and UI forms.
//
// No `baseColor`, no `photoUrls` — both were removed in the Phase 1/2 cleanup.

export type ProductRowCategory = {
  id: string
  slug: string
  name: string
  sendUnitId: string
  stockUnitId: string
  itemCoverageUnitId: string
  sendUnit: string
  stockUnit: string
  itemCoverageUnit: string
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
  category: ProductRowCategory
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

export function toProductForm(row: ProductRow): ProductForm {
  return {
    categoryId: row.categoryId,
    manufacturerId: row.manufacturerId,
    style: row.style,
    color: row.color,
    width: row.width,
    sheetSize: row.sheetSize,
    thickness: row.thickness,
    unitWeight: row.unitWeight,
    coveragePerUnit: row.coveragePerUnit,
    notes: row.notes,
  }
}
