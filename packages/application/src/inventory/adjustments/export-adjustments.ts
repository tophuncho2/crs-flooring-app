import {
  normalizeIdFilter,
  resolveExportRowCap,
  type EnrichedInventoryAdjustmentRow,
  type InventoryAdjustmentListFilters,
} from "@builders/domain"
import { exportAdjustmentsForListView } from "@builders/db"
import type { ListInput, ListSort } from "../../../list-view/contracts.js"
import { resolveInventoryListSort } from "../list-inventory-input.js"

export type AdjustmentsExportInput = {
  filters?: InventoryAdjustmentListFilters
  sort?: ListSort
  sorts?: ListSort[]
  /** Ticked row ids — when present, scopes the export to exactly these rows. */
  ids?: ReadonlyArray<string>
  /** Requested row cap (`number` or `"all"`); clamped to the hard ceiling. */
  cap?: number | "all"
}

export type AdjustmentsExportResult = {
  rows: EnrichedInventoryAdjustmentRow[]
  /** Total rows matching the scope, before the cap — lets the route flag truncation. */
  total: number
}

/**
 * Resolve the adjustments CSV export: the same filter/sort normalization as the
 * list read (`listAdjustmentsUseCase`), plus an optional ticked-id scope, capped
 * at the resolved row ceiling. Reuses the generic inventory sort resolver (the
 * shape + cap match, as the list use case already does). Returns the rows and
 * the full match `total` so the route can report "first N of M".
 */
export async function exportAdjustmentsUseCase(
  input: AdjustmentsExportInput,
): Promise<AdjustmentsExportResult> {
  const take = resolveExportRowCap(input.cap)

  const warehouseId = normalizeIdFilter(input.filters?.warehouseId)
  const categoryId = normalizeIdFilter(input.filters?.categoryId)
  const productId = normalizeIdFilter(input.filters?.productId)
  const adjNumber = input.filters?.adjNumber?.trim() || undefined
  const invNumber = input.filters?.invNumber?.trim() || undefined
  const rollNumber = input.filters?.rollNumber?.trim() || undefined
  const dyeLot = input.filters?.dyeLot?.trim() || undefined
  const note = input.filters?.note?.trim() || undefined
  const ids = normalizeIdFilter(input.ids)

  const filters: InventoryAdjustmentListFilters = {
    ...(ids ? { id: ids } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(productId ? { productId } : {}),
    ...(adjNumber ? { adjNumber } : {}),
    ...(invNumber ? { invNumber } : {}),
    ...(rollNumber ? { rollNumber } : {}),
    ...(dyeLot ? { dyeLot } : {}),
    ...(note ? { note } : {}),
  }

  const sort = resolveInventoryListSort(input)

  const { rows, total } = await exportAdjustmentsForListView({
    filters,
    ...(sort ? { sort } : {}),
    take,
  })

  return { rows, total }
}
