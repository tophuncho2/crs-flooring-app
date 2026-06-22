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
}

export type ProductRow = {
  id: string
  name: string
  categoryId: string
  manufacturerId: string
  manufacturerName: string
  style: string
  color: string
  // Send / stock unit name + abbreviation snapshots, stamped onto
  // the product row at write time from the chosen category. Reads never join
  // through `category → unit_of_measure`. Empty string when the category does
  // not have the corresponding unit configured.
  sendUnitName: string
  sendUnitAbbrev: string
  stockUnitName: string
  stockUnitAbbrev: string
  // Coverage per stock unit. Mutable reference value (no business logic depends
  // on it yet) — stored as a string here; the read normalizer converts the
  // Decimal column to a string and "" when null.
  coveragePerUnit: string
  productNamingAddon: string
  createdAt: string
  updatedAt: string
  category: ProductRowCategory
}

/** Read-only totals for the product record-view "Statistics" section. */
export type ProductStats = {
  templateItemsCount: number
  workOrderItemsCount: number
  inventoryCount: number
  adjustmentsCount: number
}

// Create form — accepts categoryId. Used by the create-product flow.
export type ProductCreateForm = {
  categoryId: string
  manufacturerId: string
  style: string
  color: string
  // Mutable on create AND update — not an immutable snapshot. Empty string clears it.
  coveragePerUnit: string
  productNamingAddon: string
}

// Update form — categoryId is omitted: it's immutable post-create (it drives
// the unit snapshots). Enforced by type, validator, and
// `isProductCategoryChangeBlocked`.
export type ProductUpdateForm = Omit<ProductCreateForm, "categoryId">

// Slim option shape for product pickers / dropdowns. Matches the DB-layer
// `ProductOptionRecord` shape — kept in domain so picker requests + search
// use cases consume the canonical contract.
//
// Carries BOTH unit snapshots (send + stock). Send-unit drives material-item
// quantity-cell suffixes (work orders + templates); stock-unit drives the
// staged-inventory-rows starting-stock cell suffix (imports). Picker
// consumers ignore the fields they don't use.
export type ProductOption = {
  id: string
  name: string
  categoryId: string
  /** The product's category name, for pickers that surface the derived category. */
  categoryName: string
  sendUnitName: string
  sendUnitAbbrev: string
  stockUnitName: string
  stockUnitAbbrev: string
}

export const EMPTY_PRODUCT_CREATE_FORM: ProductCreateForm = {
  categoryId: "",
  manufacturerId: "",
  style: "",
  color: "",
  coveragePerUnit: "",
  productNamingAddon: "",
}

export function toProductUpdateForm(row: ProductRow): ProductUpdateForm {
  return {
    manufacturerId: row.manufacturerId,
    style: row.style,
    color: row.color,
    coveragePerUnit: row.coveragePerUnit,
    productNamingAddon: row.productNamingAddon,
  }
}
