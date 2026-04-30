/**
 * Canonical split of inventory row columns by who's allowed to change them.
 * Keeps this invariant in one spot so the record form, the diff validator,
 * and the data-layer patch shape all agree.
 *
 * - IMMUTABLE: worker-seeded at import time; never re-edited.
 *              Includes every "numbers the cuts math depends on" column.
 * - EDITABLE:  the user can change these on the inventory record view.
 * - TRANSACTIONAL: only mutated inside a cut-log save transaction — the
 *                  cut-log use case (later sweep) writes `totalCutSum` atomically.
 */
export const INVENTORY_IMMUTABLE_FIELDS = [
  "startingStock",
  "coveragePerUnit",
  "importEntryId",
  "productId",
  "categorySlug",
  "stockUnitName",
  "stockUnitAbbrev",
  "itemCoverageUnitName",
  "itemCoverageUnitAbbrev",
  "sendUnitName",
  "sendUnitAbbrev",
  "fifoReceivedAt",
] as const

export const INVENTORY_EDITABLE_FIELDS = [
  "itemNumber",
  "dyeLot",
  "locationId",
  "warehouseId",
  "notes",
  "isArchived",
] as const

export const INVENTORY_TRANSACTIONAL_FIELDS = ["totalCutSum"] as const

export type InventoryImmutableField = (typeof INVENTORY_IMMUTABLE_FIELDS)[number]
export type InventoryEditableField = (typeof INVENTORY_EDITABLE_FIELDS)[number]
export type InventoryTransactionalField = (typeof INVENTORY_TRANSACTIONAL_FIELDS)[number]

export function isInventoryFieldEditable(field: string): field is InventoryEditableField {
  return (INVENTORY_EDITABLE_FIELDS as readonly string[]).includes(field)
}

export function isInventoryFieldImmutable(field: string): field is InventoryImmutableField {
  return (INVENTORY_IMMUTABLE_FIELDS as readonly string[]).includes(field)
}

export function isInventoryFieldTransactional(field: string): field is InventoryTransactionalField {
  return (INVENTORY_TRANSACTIONAL_FIELDS as readonly string[]).includes(field)
}

import { categoryRequiresCoveragePerUnit } from "../categories/rules.js"

/**
 * True when the given category slug supports coverage-balance computation
 * (i.e. the category has a coverage-per-unit concept). Thin delegation to
 * `categoryRequiresCoveragePerUnit` so the inventory module exposes the
 * coverage-support check under a domain-local name without duplicating the
 * slug list — the four supported slugs live in `categories/rules.ts` as the
 * keys of `CATEGORY_UNIT_RULES`.
 */
export function categorySupportsCoverageComputation(categorySlug: string): boolean {
  return categoryRequiresCoveragePerUnit(categorySlug)
}

/**
 * Human-readable copy for an attempt to edit a non-editable inventory field.
 * Co-located with the predicate that gates the rejection.
 */
export function buildInventoryFieldNotEditableMessage(field: string): string {
  return `Inventory field "${field}" is not user-editable.`
}
