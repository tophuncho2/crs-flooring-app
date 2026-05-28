import { isLocalOnlyRecordRow } from "@/controllers/record/utils/record-row-ids"
import type {
  WorkOrderMaterialItemCreateForm,
  WorkOrderMaterialItemRow,
  WorkOrderMaterialItemUpdateForm,
  WorkOrderMaterialItemsDiff,
} from "@builders/domain"
import {
  validateWorkOrderMaterialItemCreateForm,
  validateWorkOrderMaterialItemUpdateForm,
} from "@builders/domain"
import type {
  WorkOrderMaterialItemLocal,
  WorkOrderMaterialItemsLocalState,
} from "./types"

// --- Local-row construction ---

export const BLANK_MATERIAL_ITEM_LOCAL_DEFAULTS: Omit<
  WorkOrderMaterialItemLocal,
  "id"
> = {
  productId: "",
  productName: "",
  sendUnitAbbrev: "",
  quantity: "",
  notes: "",
  categoryFilterId: null,
  hasCutLogs: false,
}

export function createBlankMaterialItemLocal(id: string): WorkOrderMaterialItemLocal {
  return { id, ...BLANK_MATERIAL_ITEM_LOCAL_DEFAULTS }
}

export function toLocalItem(row: WorkOrderMaterialItemRow): WorkOrderMaterialItemLocal {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    sendUnitAbbrev: row.sendUnitAbbrev,
    quantity: row.quantity,
    notes: row.notes,
    categoryFilterId: null,
    hasCutLogs: row.hasCutLogs,
  }
}

export function createLocalState(
  rows: WorkOrderMaterialItemRow[],
): WorkOrderMaterialItemsLocalState {
  return { items: rows.map(toLocalItem) }
}

// --- Identity / sort ---

export function createItemsRevisionKey(rows: WorkOrderMaterialItemRow[]) {
  return JSON.stringify(
    rows.map((row) => `${row.id}:${row.productId}:${row.quantity}:${row.notes}`),
  )
}

export function byCreatedAtDesc(
  a: WorkOrderMaterialItemRow,
  b: WorkOrderMaterialItemRow,
): number {
  return b.createdAt.localeCompare(a.createdAt)
}

// --- Diff ---

function serverItemById(rows: WorkOrderMaterialItemRow[]) {
  const map = new Map<string, WorkOrderMaterialItemRow>()
  for (const row of rows) map.set(row.id, row)
  return map
}

// Product is editable until the item has cut logs, so productId joins
// (quantity, notes) in the modified-row diff identity. The server re-checks
// the cut-log lock before persisting a product change.
function itemsDiffer(local: WorkOrderMaterialItemLocal, server: WorkOrderMaterialItemRow) {
  return (
    local.productId !== server.productId ||
    local.quantity !== server.quantity ||
    local.notes !== server.notes
  )
}

export function toCreateForm(
  local: WorkOrderMaterialItemLocal,
): WorkOrderMaterialItemCreateForm {
  return {
    productId: local.productId,
    quantity: local.quantity,
    notes: local.notes,
  }
}

export function toUpdateForm(
  local: WorkOrderMaterialItemLocal,
): WorkOrderMaterialItemUpdateForm {
  return {
    productId: local.productId,
    quantity: local.quantity,
    notes: local.notes,
  }
}

export function buildMaterialItemsDiff(
  local: WorkOrderMaterialItemsLocalState,
  serverRows: WorkOrderMaterialItemRow[],
): WorkOrderMaterialItemsDiff {
  const serverById = serverItemById(serverRows)
  const localIds = new Set(local.items.map((item) => item.id))

  const added = local.items
    .filter((item) => isLocalOnlyRecordRow(item.id))
    .map((item) => ({ tempId: item.id, form: toCreateForm(item) }))

  // Local iterates newest-first (prepend on add/duplicate). Reverse so the
  // server stamps createdAt oldest → newest in submission order — keeps
  // the post-save DESC sort consistent with the user's local view.
  added.reverse()

  const modified: WorkOrderMaterialItemsDiff["modified"] = []
  for (const item of local.items) {
    if (isLocalOnlyRecordRow(item.id)) continue
    const serverRow = serverById.get(item.id)
    if (!serverRow) continue
    if (itemsDiffer(item, serverRow)) {
      modified.push({ id: item.id, form: toUpdateForm(item) })
    }
  }

  const deleted = serverRows
    .filter((row) => !localIds.has(row.id))
    .map((row) => ({ id: row.id }))

  return { added, modified, deleted }
}

// --- Validation ---

/**
 * Validates the draft list. Returns the first error message found, or
 * null if every row passes. Caller is responsible for throwing
 * `createRecordSectionError` so the engine surfaces it — separating the
 * pure check from the throw keeps this function testable.
 */
export function validateMaterialItemsDraft(
  items: WorkOrderMaterialItemLocal[],
): string | null {
  for (const item of items) {
    const validationError = isLocalOnlyRecordRow(item.id)
      ? validateWorkOrderMaterialItemCreateForm(toCreateForm(item))
      : validateWorkOrderMaterialItemUpdateForm(toUpdateForm(item))
    if (validationError) return validationError
  }
  return null
}
