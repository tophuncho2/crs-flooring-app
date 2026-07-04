import { normalizeIdFilter } from "@builders/domain"
import type { ListInput, ListSort } from "../list-view/contracts.js"

export type InventoryListFilters = {
  warehouseId?: ReadonlyArray<string>
  categoryId?: ReadonlyArray<string>
  productId?: ReadonlyArray<string>
  importNumber?: ReadonlyArray<string>
  purchaseOrderNumber?: ReadonlyArray<string>
  location?: string
  isArchived?: boolean
  // Per-field identity search — the four list-view search bars. Each is a
  // free-text ILIKE against its own column (`inventoryNumber`/`rollNumber`/
  // `dyeLot`/`note`); multiple set fields AND together to narrow.
  invNumber?: string
  rollNumber?: string
  dyeLot?: string
  note?: string
}

/** The resolved repo-facing filters object (matches the read repo filter shape). */
export type ResolvedInventoryListFilters = {
  warehouseId?: ReadonlyArray<string>
  categoryId?: ReadonlyArray<string>
  productId?: ReadonlyArray<string>
  importNumber?: ReadonlyArray<string>
  purchaseOrderNumber?: ReadonlyArray<string>
  location?: string
  isArchived?: boolean
  invNumber?: string
  rollNumber?: string
  dyeLot?: string
  note?: string
}

/** Max simultaneous sort columns the inventory list composes (mirrors WO). */
export const INVENTORY_MAX_SORT_LEVELS = 3

/**
 * Normalize raw list-filter input (trim/dedupe ids, drop empties) into the
 * repo-facing filters object — `undefined` when nothing survives. Shared by the
 * list read and the export read so both scope inventory identically.
 */
export function resolveInventoryListFilters(
  filters: InventoryListFilters | undefined,
): ResolvedInventoryListFilters | undefined {
  const warehouseId = normalizeIdFilter(filters?.warehouseId)
  const categoryId = normalizeIdFilter(filters?.categoryId)
  const productId = normalizeIdFilter(filters?.productId)
  const importNumber = normalizeIdFilter(filters?.importNumber)
  const purchaseOrderNumber = normalizeIdFilter(filters?.purchaseOrderNumber)
  const location = filters?.location?.trim() || undefined
  const isArchived = filters?.isArchived
  const invNumber = filters?.invNumber?.trim() || undefined
  const rollNumber = filters?.rollNumber?.trim() || undefined
  const dyeLot = filters?.dyeLot?.trim() || undefined
  const note = filters?.note?.trim() || undefined

  const hasAny =
    warehouseId ||
    categoryId ||
    productId ||
    importNumber ||
    purchaseOrderNumber ||
    location ||
    isArchived !== undefined ||
    invNumber ||
    rollNumber ||
    dyeLot ||
    note

  if (!hasAny) return undefined

  return {
    ...(warehouseId ? { warehouseId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(productId ? { productId } : {}),
    ...(importNumber ? { importNumber } : {}),
    ...(purchaseOrderNumber ? { purchaseOrderNumber } : {}),
    ...(location ? { location } : {}),
    ...(isArchived !== undefined ? { isArchived } : {}),
    ...(invNumber ? { invNumber } : {}),
    ...(rollNumber ? { rollNumber } : {}),
    ...(dyeLot ? { dyeLot } : {}),
    ...(note ? { note } : {}),
  }
}

/**
 * Resolve the canonical multi-column sort (capped at {@link INVENTORY_MAX_SORT_LEVELS})
 * into the repo's ordered entries. `sorts` is canonical; a single `sort` is the
 * legacy fallback. Returns `undefined` when no sort is requested.
 */
export function resolveInventoryListSort(
  input: Pick<ListInput<unknown>, "sort" | "sorts">,
): { entries: ListSort[] } | undefined {
  const sortList = input.sorts ?? (input.sort ? [input.sort] : [])
  const entries = sortList
    .slice(0, INVENTORY_MAX_SORT_LEVELS)
    .map((entry) => ({ field: entry.field, direction: entry.direction }))
  return entries.length > 0 ? { entries } : undefined
}
