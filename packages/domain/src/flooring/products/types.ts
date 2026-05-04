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
  // Send / stock / item-coverage unit name + abbreviation snapshots, stamped onto
  // the product row at write time from the chosen category. Reads never join
  // through `category → unit_of_measure`. Empty string when the category does
  // not have the corresponding unit configured.
  sendUnitName: string
  sendUnitAbbrev: string
  stockUnitName: string
  stockUnitAbbrev: string
  itemCoverageUnitName: string
  itemCoverageUnitAbbrev: string
  // Backward-compat alias for `itemCoverageUnitName`. Future cleanup target.
  coverageUnit: string
  notes: string
  createdAt: string
  updatedAt: string
  category: ProductRowCategory
}

// Create form — accepts categoryId. Used by the create-product flow.
export type ProductCreateForm = {
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

// Update form — categoryId is omitted. Category is immutable post-create
// (enforced by type, validator, and `isProductCategoryChangeBlocked`).
export type ProductUpdateForm = Omit<ProductCreateForm, "categoryId">

// Slim option shape for product pickers / dropdowns. Matches the DB-layer
// `ProductOptionRecord` shape — kept in domain so picker requests + search
// use cases consume the canonical contract.
export type ProductOption = {
  id: string
  name: string
  categoryId: string
  sendUnitName: string
  sendUnitAbbrev: string
}

export const EMPTY_PRODUCT_CREATE_FORM: ProductCreateForm = {
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

export function toProductUpdateForm(row: ProductRow): ProductUpdateForm {
  return {
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
