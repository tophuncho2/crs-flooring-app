import { listAdjustmentsForListView } from "@builders/db"
import {
  INVENTORY_ADJUSTMENTS_LIST_MAX_PAGE_SIZE,
  INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
  type EnrichedInventoryAdjustmentRow,
  type InventoryAdjustmentListFilters,
} from "@builders/domain"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"
import { resolveInventoryListSort } from "../list-inventory-input.js"

function normalizeIds(
  raw: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!raw || raw.length === 0) return undefined
  const cleaned = Array.from(
    new Set(raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  )
  return cleaned.length > 0 ? cleaned : undefined
}

export async function listAdjustmentsUseCase(
  input: ListInput<InventoryAdjustmentListFilters>,
): Promise<ListOutput<EnrichedInventoryAdjustmentRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE)
  const pageSize = Math.max(
    1,
    Math.min(INVENTORY_ADJUSTMENTS_LIST_MAX_PAGE_SIZE, requestedPageSize),
  )

  const warehouseId = normalizeIds(input.filters?.warehouseId)
  const categoryId = normalizeIds(input.filters?.categoryId)
  const productId = normalizeIds(input.filters?.productId)
  const adjNumber = input.filters?.adjNumber?.trim() || undefined
  const invNumber = input.filters?.invNumber?.trim() || undefined
  const rollNumber = input.filters?.rollNumber?.trim() || undefined
  const dyeLot = input.filters?.dyeLot?.trim() || undefined
  const note = input.filters?.note?.trim() || undefined

  // Canonical multi-column sort (capped at 3) resolved from `?sorts=`; the
  // generic inventory resolver is reused since the shape is identical and the
  // cap matches. Undefined when no sort is requested → repo falls back to the
  // newest-first ledger default.
  const sort = resolveInventoryListSort(input)

  const { rows, total } = await listAdjustmentsForListView({
    filters: {
      ...(warehouseId ? { warehouseId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(productId ? { productId } : {}),
      ...(adjNumber ? { adjNumber } : {}),
      ...(invNumber ? { invNumber } : {}),
      ...(rollNumber ? { rollNumber } : {}),
      ...(dyeLot ? { dyeLot } : {}),
      ...(note ? { note } : {}),
    },
    page,
    pageSize,
    ...(sort ? { sort } : {}),
  })

  return { rows, total }
}
