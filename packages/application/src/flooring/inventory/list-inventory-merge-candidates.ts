import {
  LIST_INVENTORY_MAX_PAGE_SIZE,
  LIST_INVENTORY_PAGE_SIZE,
  type InventoryRow,
} from "@builders/domain"
import { listInventoryMergeCandidates } from "@builders/db"
import type { ListOutput } from "../../list-view/contracts.js"

export type ListInventoryMergeCandidatesInput = {
  /** Locked product scope — candidates are always a single product. */
  productId: string
  /** Optional warehouse narrowing (the merge picker is warehouse-agnostic). */
  warehouseId?: string
  invNumber?: string
  rollNumber?: string
  dyeLot?: string
  note?: string
  page?: number
  pageSize?: number
}

/**
 * List the inventory rows eligible to be merged for a product — the candidate
 * picker behind `/dashboard/inventory/merge`. Excludes archived, already-merged,
 * and zero-balance rows (enforced in the data read). Returns the same
 * `{ rows, total }` shape as the list view so the picker grid reuses its
 * pagination. An empty/blank product yields no candidates (the picker only
 * fetches once a product is picked).
 */
export async function listInventoryMergeCandidatesUseCase(
  input: ListInventoryMergeCandidatesInput,
): Promise<ListOutput<InventoryRow>> {
  const productId = input.productId?.trim() ?? ""
  if (productId.length === 0) return { rows: [], total: 0 }

  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_INVENTORY_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_INVENTORY_MAX_PAGE_SIZE, requestedPageSize))

  const warehouseId = input.warehouseId?.trim() || undefined
  const invNumber = input.invNumber?.trim() || undefined
  const rollNumber = input.rollNumber?.trim() || undefined
  const dyeLot = input.dyeLot?.trim() || undefined
  const note = input.note?.trim() || undefined

  return listInventoryMergeCandidates({
    productId,
    ...(warehouseId ? { warehouseId } : {}),
    ...(invNumber ? { invNumber } : {}),
    ...(rollNumber ? { rollNumber } : {}),
    ...(dyeLot ? { dyeLot } : {}),
    ...(note ? { note } : {}),
    skip: (page - 1) * pageSize,
    take: pageSize,
  })
}
