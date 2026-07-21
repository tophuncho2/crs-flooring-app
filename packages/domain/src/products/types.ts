// Canonical domain types for products. Mirrors ProductRecord / ProductDetailRecord
// over in @builders/db; kept in the domain package because it is the business-facing
// contract consumed by use cases and UI forms.
//
// No `baseColor`, no `photoUrls` — both were removed in the Phase 1/2 cleanup.

import { DEFAULT_PALETTE_COLOR, type PaletteColor } from "../shared/palette.js"

export type ProductRowCategory = {
  id: string
  name: string
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
  // real unit — reads resolve it from the FK join (no snapshot fallback).
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
  // Money-standard cost (Decimal(12,2) column). Stored as a normalized string
  // here ("" when null); the read normalizer runs it through normalizeMoneyAmount
  // so trailing zeros are canonical (no falsely-dirty rows). Pasted into a
  // template's planned product when this product is picked (future consumer).
  cost: string
  // The unit `cost` is priced per (e.g. $/sq ft) — the product's OWN cost-unit FK
  // + resolved unit. Optional ("" / null until picked). Independent of `unitId`.
  costUnitId: string
  costUnit: ProductRowUnit | null
  // Money-standard sell price (Decimal(12,2) column). Normalized string ("" when
  // null). The customer-facing price per unit; seeded onto a template's planned
  // product when this product is picked (editable there). Bare money — no unit FK.
  unitPrice: string
  // Conversion feature: the formula this product converts stock with. Picked in
  // the product form; seeded onto inventory/adjustment/staged rows on select.
  // `conversionFormulaName` is the resolved label for the picker trigger ("" when
  // unset). The converted balance itself is derived on the consuming rows.
  conversionFormulaId: string
  conversionFormulaName: string
  productNamingAddon: string
  // Archive flag (mirrors inventory). Default-hidden from the products list and
  // excluded from every product picker's options. Metadata-only — no name/cost/
  // coverage recompute depends on it.
  isArchived: boolean
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
  plannedProductsCount: number
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
  // Money-standard cost + the unit it's priced per. Both optional ("" clears).
  // Editable on create AND update, independent of each other and of `unitId`.
  cost: string
  costUnitId: string
  // Money-standard sell price. Optional ("" clears). Editable on create AND
  // update, independent of cost. Bare money — no unit FK.
  unitPrice: string
  // Conversion formula FK (UoM conversion feature). Optional — "" clears it.
  // Chosen via the formula picker; seeds inventory/adjustment/staged rows.
  conversionFormulaId: string
  productNamingAddon: string
  // Non-semantic palette tag. Carried on the shared draft so the record-view
  // edit form can re-pick it; the create flow never renders a picker and the
  // create API validator ignores it, so new rows fall to the DB default SLATE.
  paletteColor: PaletteColor
  // Archive flag. Carried on the shared draft so the record-view edit form can
  // toggle it; the create flow never renders the control and the create API
  // validator ignores it, so new rows fall to the DB default `false`.
  isArchived: boolean
}

// Update form — carries the same fields as create. `categoryId` is now MUTABLE
// (UoM epic 2A retired the unit snapshots that made it immutable; a category
// change recomposes the stored name in `update-product`). `unitId` is editable too.
export type ProductUpdateForm = ProductCreateForm

// Slim option shape for product pickers / dropdowns. Matches the DB-layer
// `ProductOptionRecord` shape — kept in domain so picker requests + search
// use cases consume the canonical contract.
//
// Carries the product's single unit label (name + abbrev), derived from its
// `unit` FK. Drives material-item quantity-cell suffixes (work orders +
// templates) and the staged-inventory-rows starting-stock cell suffix
// (imports). Picker consumers ignore the fields they don't use.
export type ProductOption = {
  id: string
  name: string
  categoryId: string
  // Canonical unit FK (UoM epic 2A). Carried so downstream pickers can seed a
  // row's unit from the picked product in later sub-plans.
  unitId: string
  /** The product's category name, for pickers that surface the derived category. */
  categoryName: string
  unitName: string
  unitAbbrev: string
  // The product's live cost (canonical money string; "" when unset). Carried so a
  // row picker can seed a freshly-added (unsaved) row's live cost for pricing math
  // before the server re-resolves it off the product join on save.
  cost: string
  // The product's sell price (canonical money string; "" when unset). Carried so a
  // planned-product row seeds its editable unit price from the picked product.
  unitPrice: string
  // Conversion seed source — copied onto inventory/adjustment/staged rows on
  // product-select (all editable there). Labels ride along for picker triggers.
  coverageUnitId: string
  coverageUnitName: string
  coverageUnitAbbrev: string
  coveragePerUnit: string
  conversionFormulaId: string
  conversionFormulaName: string
}

export const EMPTY_PRODUCT_CREATE_FORM: ProductCreateForm = {
  categoryId: "",
  unitId: "",
  entityId: "",
  style: "",
  color: "",
  coveragePerUnit: "",
  coverageUnitId: "",
  cost: "",
  costUnitId: "",
  unitPrice: "",
  conversionFormulaId: "",
  productNamingAddon: "",
  paletteColor: DEFAULT_PALETTE_COLOR,
  isArchived: false,
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
    cost: row.cost,
    costUnitId: row.costUnitId,
    unitPrice: row.unitPrice,
    conversionFormulaId: row.conversionFormulaId,
    productNamingAddon: row.productNamingAddon,
    paletteColor: row.paletteColor,
    isArchived: row.isArchived,
  }
}
