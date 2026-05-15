import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyWorkOrderMaterialItemsDiff,
  getProductById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assignDraftIds,
  buildItemSendUnitSnapshotFromProduct,
  validateWorkOrderMaterialItemCreateForm,
  validateWorkOrderMaterialItemUpdateForm,
  type ItemSendUnitSnapshot,
} from "@builders/domain"
import { WorkOrderMaterialItemExecutionError } from "./errors.js"
import type {
  SaveWorkOrderMaterialItemsSectionUseCaseInput,
  SaveWorkOrderMaterialItemsSectionUseCaseResult,
} from "./types.js"

/**
 * Diff-save use case mirroring the templates' MI section save:
 *  1. Validate every draft (create form) + update (update form).
 *  2. Batch-fetch every distinct product the `added` drafts touch.
 *  3. Stamp the send-unit snapshot onto each draft via
 *     `buildItemSendUnitSnapshotFromProduct`. Modified rows skip this
 *     step — productId is locked post-create, so the existing snapshot
 *     on the DB row stays valid.
 *  4. Assign UUIDs to drafts via `assignDraftIds`.
 *  5. Hand off to `applyWorkOrderMaterialItemsDiff`. The data layer
 *     nulls cut-log links on any deleted WOMI inside the same TX
 *     before deleting — preserves linkage symmetry.
 *
 * Returns updated items + tempIdMap for the UI to reconcile draft state.
 */
export async function saveWorkOrderMaterialItemsSectionUseCase(
  input: SaveWorkOrderMaterialItemsSectionUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<SaveWorkOrderMaterialItemsSectionUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    for (const draft of input.diff.added) {
      const validationError = validateWorkOrderMaterialItemCreateForm(draft.form)
      if (validationError) {
        throw new WorkOrderMaterialItemExecutionError({
          code: "WORK_ORDER_MATERIAL_ITEM_VALIDATION_FAILED",
          message: validationError,
          status: 400,
          payload: { refKind: "tempId", ref: draft.tempId },
        })
      }
    }

    for (const update of input.diff.modified) {
      const validationError = validateWorkOrderMaterialItemUpdateForm(update.form)
      if (validationError) {
        throw new WorkOrderMaterialItemExecutionError({
          code: "WORK_ORDER_MATERIAL_ITEM_VALIDATION_FAILED",
          message: validationError,
          status: 400,
          payload: { refKind: "id", ref: update.id },
        })
      }
    }

    const distinctProductIds = Array.from(
      new Set(input.diff.added.map((d) => d.form.productId)),
    )
    const products = await Promise.all(
      distinctProductIds.map(async (productId) => ({
        productId,
        product: await getProductById(productId, c),
      })),
    )
    const snapshotByProductId = new Map<string, ItemSendUnitSnapshot>()
    for (const entry of products) {
      if (!entry.product) {
        throw new WorkOrderMaterialItemExecutionError({
          code: "WORK_ORDER_MATERIAL_ITEM_VALIDATION_FAILED",
          message: "Selected product was not found",
          status: 400,
          field: "productId",
          payload: { productId: entry.productId },
        })
      }
      snapshotByProductId.set(entry.productId, buildItemSendUnitSnapshotFromProduct(entry.product))
    }

    const addedWithIds = assignDraftIds(input.diff.added, randomUUID)

    return applyWorkOrderMaterialItemsDiff(c, {
      workOrderId: input.workOrderId,
      added: addedWithIds.map((draft) => ({
        id: draft.id,
        tempId: draft.tempId,
        input: { ...draft.form, ...snapshotByProductId.get(draft.form.productId)! },
      })),
      modified: input.diff.modified.map((update) => ({
        id: update.id,
        input: update.form,
      })),
      deleted: input.diff.deleted.map((d) => ({ id: d.id })),
    })
  })
}
