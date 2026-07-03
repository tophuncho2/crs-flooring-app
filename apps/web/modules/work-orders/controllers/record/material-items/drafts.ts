import { buildRowDiff, isLocalOnlyRecordRow } from "@/engines/record-view"
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
  unitId: "",
  sendUnitName: "",
  sendUnitAbbrev: "",
  quantity: "",
  notes: "",
  categoryFilterId: null,
}

export function createBlankMaterialItemLocal(id: string): WorkOrderMaterialItemLocal {
  return { id, ...BLANK_MATERIAL_ITEM_LOCAL_DEFAULTS }
}

export function toLocalItem(row: WorkOrderMaterialItemRow): WorkOrderMaterialItemLocal {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    unitId: row.unitId,
    sendUnitName: row.sendUnitName,
    sendUnitAbbrev: row.sendUnitAbbrev,
    quantity: row.quantity,
    notes: row.notes,
    categoryFilterId: null,
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
    rows.map((row) => `${row.id}:${row.productId}:${row.unitId}:${row.quantity}:${row.notes}`),
  )
}

export function byCreatedAtDesc(
  a: WorkOrderMaterialItemRow,
  b: WorkOrderMaterialItemRow,
): number {
  return b.createdAt.localeCompare(a.createdAt)
}

// --- Diff ---

// Product is editable until the item has adjustments, so productId joins
// (quantity, notes) in the modified-row diff identity. The server re-checks
// the adjustment lock before persisting a product change.
function itemsDiffer(local: WorkOrderMaterialItemLocal, server: WorkOrderMaterialItemRow) {
  return (
    local.productId !== server.productId ||
    local.unitId !== server.unitId ||
    local.quantity !== server.quantity ||
    local.notes !== server.notes
  )
}

export function toCreateForm(
  local: WorkOrderMaterialItemLocal,
): WorkOrderMaterialItemCreateForm {
  return {
    productId: local.productId,
    unitId: local.unitId,
    quantity: local.quantity,
    notes: local.notes,
  }
}

export function toUpdateForm(
  local: WorkOrderMaterialItemLocal,
): WorkOrderMaterialItemUpdateForm {
  return {
    productId: local.productId,
    unitId: local.unitId,
    quantity: local.quantity,
    notes: local.notes,
  }
}

export function buildMaterialItemsDiff(
  local: WorkOrderMaterialItemsLocalState,
  serverRows: WorkOrderMaterialItemRow[],
): WorkOrderMaterialItemsDiff {
  // Local iterates newest-first (prepend on add/duplicate). reverseAdded so the
  // server stamps createdAt oldest → newest in submission order — keeps the
  // post-save DESC sort consistent with the user's local view.
  return buildRowDiff({
    locals: local.items,
    serverRows,
    getLocalId: (item) => item.id,
    isLocalOnly: isLocalOnlyRecordRow,
    differs: itemsDiffer,
    toAdded: (item) => ({ tempId: item.id, form: toCreateForm(item) }),
    toModified: (item) => ({ id: item.id, form: toUpdateForm(item) }),
    reverseAdded: true,
  })
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
