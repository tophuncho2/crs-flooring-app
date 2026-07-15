// Canonical domain types for inventory indicators — low-stock trackers scoped to
// one (product, warehouse, unit) triple. Mirrors the adjustments contract
// (child of a parent record), but the parent here is the product.

import type { ProductSearchInput } from "../list-filters.js"
import type { IndicatorStockStatus } from "./status.js"

export type InventoryIndicatorRow = {
  id: string
  // Canonical human-facing record number ("IND-1"), sequence-backed + generated
  // at the DB. Mirrors inventoryNumber / adjustmentNumber.
  indicatorNumber: string
  productId: string
  productName: string
  productNumber: string
  warehouseId: string
  warehouseName: string
  // Identity unit FK (immutable after create). Display flows through the derived
  // `unitAbbrev`/`unitName`.
  unitId: string
  unitName: string | null
  unitAbbrev: string | null
  // Money-standard string ("" when no threshold set → neutral status). Normalized
  // on read so trailing zeros are canonical (no falsely-dirty rows).
  lowStockThreshold: string
  // Live SUM(stockQuantity) for the (product, warehouse, unit) triple, as a
  // normalized money string. Derived on read — never persisted.
  currentStock: string
  // Derived colored status ("ok" | "low" | "none") + its label. The apps-side
  // row-cell maps `status` to a BadgeTone (green / amber / neutral).
  status: IndicatorStockStatus
  statusLabel: string
  internalNotes: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

/**
 * Prev/next indicator in the standalone list order (`createdAt DESC, id DESC`),
 * walked by the record-view Indicators-section stepper. `indicatorNumber` labels
 * the stepper; `id` drives the in-place select. Null at the ends.
 */
export type InventoryIndicatorNeighbor = {
  id: string
  indicatorNumber: string
}

export type InventoryIndicatorNeighbors = {
  previousIndicator: InventoryIndicatorNeighbor | null
  nextIndicator: InventoryIndicatorNeighbor | null
}

export type InventoryIndicatorPage = {
  rows: InventoryIndicatorRow[]
  hasMore: boolean
}

// Create form — the identity triple (productId is fixed by the record-view
// context; warehouseId + unitId chosen via the shared pickers) plus the editable
// threshold/notes/active fields.
export type InventoryIndicatorCreateForm = {
  warehouseId: string
  unitId: string
  // Optional money-standard threshold ("" clears → neutral status).
  lowStockThreshold: string
  internalNotes: string
  isActive: boolean
}

// Update form — the editable subset only. The identity triple is immutable, so it
// is absent here (see editability.ts).
export type InventoryIndicatorUpdateForm = {
  lowStockThreshold: string
  internalNotes: string
  isActive: boolean
}

export const EMPTY_INDICATOR_CREATE_FORM: InventoryIndicatorCreateForm = {
  warehouseId: "",
  unitId: "",
  lowStockThreshold: "",
  internalNotes: "",
  isActive: true,
}

/**
 * The product record-view Indicators section's atomic save payload. Mirrors the
 * templates/WO section diffs but has **no `added`** — the identity triple is
 * create-only (see editability.ts), so new indicators are created via the modal
 * (its own POST), never inline. Only edits + deletes travel in the diff.
 */
export type InventoryIndicatorsSectionDiff = {
  modified: { id: string; form: InventoryIndicatorUpdateForm }[]
  deleted: { id: string }[]
}

export type InventoryIndicatorListFilters = {
  // Explicit id scope — the CSV-export "selected rows" path. Never parsed from the
  // URL; ANDs with the other filters (mirrors the inventory/adjustments lists).
  id?: ReadonlyArray<string>
  warehouseId?: ReadonlyArray<string>
  productId?: ReadonlyArray<string>
  // Category narrows via the live `product.categoryId` relation — mirrors the
  // inventory/adjustments list chips.
  categoryId?: ReadonlyArray<string>
  // Exact integer match on the generated `indicatorNumberInt` column ("12" → IND-12).
  indicatorNumber?: string
  // The four shared product-attribute searches (PROD-#/color/style/naming addon)
  // resolve through the `product` relation — single-sourced with the other
  // product-linked lists.
} & ProductSearchInput
