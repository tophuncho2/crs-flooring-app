// Canonical domain types for products. Mirrors ProductRecord / ProductDetailRecord
// over in @builders/db; kept in the domain package because it is the business-facing
// contract consumed by use cases and UI forms.
//
// No `baseColor`, no `photoUrls` — both were removed in the Phase 1/2 cleanup.

import { DEFAULT_PALETTE_COLOR, type PaletteColor } from "../../shared/palette.js"

export type ProductRowCategory = {
  id: string
  slug: string
  name: string
  sendUnitId: string
  stockUnitId: string
}

// Resolved unit-of-measure off the FK (UoM epic 2A). `null` only on legacy rows
// not yet backfilled (column nullable until the NOT-NULL migration runs).
export type ProductRowUnit = {
  id: string
  name: string
  abbreviation: string
}

export type ProductRow = {
  id: string
  // Canonical human-facing record number ("PROD-1"), sequence-backed + generated
  // at the DB. Mirrors propertyNumber / jobTypeNumber / inventoryNumber.
  productNumber: string
  name: string
  categoryId: string
  // Canonical unit-of-measure FK + resolved unit (UoM epic 2A). The product's
  // real unit — reads resolve it from the FK; the snapshot strings below are the
  // retiring fallback.
  unitId: string
  unit: ProductRowUnit | null
  // Entity link (Entity Payments epic). entityName is the joined display name
  // (entity.entity), "" when unlinked.
  entityId: string
  entityName: string
  style: string
  color: string
  // Non-semantic palette tag (user-assigned visual color). Metadata-only — no
  // business logic reads it. Distinct from the free-text physical `color` above.
  paletteColor: PaletteColor
  // Coverage per stock unit. Mutable reference value (no business logic depends
  // on it yet) — stored as a string here; the read normalizer converts the
  // Decimal column to a string and "" when null.
  coveragePerUnit: string
  // The product's OWN coverage unit-of-measure FK + resolved unit (UoM epic 1a).
  // Optional (nullable column) — "" / null until the user picks one. Separate
  // from the main `unitId`; drives the coverage-per-unit suffix in the record view.
  coverageUnitId: string
  coverageUnit: ProductRowUnit | null
  productNamingAddon: string
  createdAt: string
  updatedAt: string
  // Actor-email snapshots: WHO created / last-updated the row. Plain nullable
  // strings (no FK), null on historical rows. Mirrors job-types / payments /
  // warehouse.
  createdBy: string | null
  updatedBy: string | null
  category: ProductRowCategory
}

/** Read-only totals for the product record-view "Statistics" section. */
export type ProductStats = {
  templateItemsCount: number
  workOrderItemsCount: number
  inventoryCount: number
  adjustmentsCount: number
}

// Create form — accepts categoryId + unitId. Used by the create-product flow.
export type ProductCreateForm = {
  categoryId: string
  // Unit-of-measure FK, chosen via the UoM picker. Required (empty string until
  // the user picks). Seeds a row's downstream units in later sub-plans.
  unitId: string
  entityId: string
  style: string
  color: string
  // Mutable on create AND update — not an immutable snapshot. Empty string clears it.
  coveragePerUnit: string
  // The product's own coverage unit FK (UoM epic 1a). Optional — "" clears it.
  // Chosen via a second UoM picker, independent of the required main `unitId`.
  coverageUnitId: string
  productNamingAddon: string
  // Non-semantic palette tag. Carried on the shared draft so the record-view
  // edit form can re-pick it; the create flow never renders a picker and the
  // create API validator ignores it, so new rows fall to the DB default SLATE.
  paletteColor: PaletteColor
}

// Update form — carries the same fields as create. `categoryId` is now MUTABLE
// (UoM epic 2A retired the unit snapshots that made it immutable; a category
// change recomposes the stored name in `update-product`). `unitId` is editable too.
export type ProductUpdateForm = ProductCreateForm

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
  // Canonical unit FK (UoM epic 2A). Carried so downstream pickers can seed a
  // row's unit from the picked product in later sub-plans.
  unitId: string
  /** The product's category name, for pickers that surface the derived category. */
  categoryName: string
  sendUnitName: string
  sendUnitAbbrev: string
  stockUnitName: string
  stockUnitAbbrev: string
}

export const EMPTY_PRODUCT_CREATE_FORM: ProductCreateForm = {
  categoryId: "",
  unitId: "",
  entityId: "",
  style: "",
  color: "",
  coveragePerUnit: "",
  coverageUnitId: "",
  productNamingAddon: "",
  paletteColor: DEFAULT_PALETTE_COLOR,
}

export function toProductUpdateForm(row: ProductRow): ProductUpdateForm {
  return {
    categoryId: row.categoryId,
    unitId: row.unitId,
    entityId: row.entityId,
    style: row.style,
    color: row.color,
    coveragePerUnit: row.coveragePerUnit,
    coverageUnitId: row.coverageUnitId,
    productNamingAddon: row.productNamingAddon,
    paletteColor: row.paletteColor,
  }
}
