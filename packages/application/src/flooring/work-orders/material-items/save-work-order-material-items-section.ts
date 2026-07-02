import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyWorkOrderMaterialItemsDiff,
  getProductById,
  listWorkOrderMaterialItems,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assignDraftIds,
  validateWorkOrderMaterialItemCreateForm,
  validateWorkOrderMaterialItemUpdateForm,
} from "@builders/domain"
import { WorkOrderMaterialItemExecutionError } from "./errors.js"
import type {
  SaveWorkOrderMaterialItemsSectionUseCaseInput,
  SaveWorkOrderMaterialItemsSectionUseCaseResult,
} from "./types.js"

/**
 * Diff-save use case mirroring the templates' MI section save:
 *  1. Validate every draft (create form) + update (update form).
 *  2. Batch-fetch every distinct product the `added` drafts AND the
 *     product-changed `modified` rows touch — to validate it exists (and to
 *     reconnect the product FK on a change). The `unitId` is NOT seeded from the
 *     product (UoM epic 2C): it's a user-managed, per-row value the client fills
 *     on product select, and the server persists only the form's own value.
 *  3. Assign UUIDs to drafts via `assignDraftIds`.
 *  4. Hand off to `applyWorkOrderMaterialItemsDiff`.
 *
 * The product is freely editable — adjustments no longer link to a material
 * item — and the same product may appear on a work order any number of times
 * (no uniqueness rule).
 *
 * Returns updated items + tempIdMap for the UI to reconcile draft state.
 */
export async function saveWorkOrderMaterialItemsSectionUseCase(
  input: SaveWorkOrderMaterialItemsSectionUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<SaveWorkOrderMaterialItemsSectionUseCaseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("saveWorkOrderMaterialItemsSectionUseCase requires a non-empty actorEmail")
  }
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

    const existingRows = await listWorkOrderMaterialItems(input.workOrderId, c)
    const existingById = new Map(existingRows.map((row) => [row.id, row]))

    // Rows whose product actually changed reconnect the product FK (the product
    // is freely editable now — no lock).
    const productChangedUpdates = input.diff.modified.filter((update) => {
      const existing = existingById.get(update.id)
      return existing !== undefined && update.form.productId.trim() !== existing.productId.trim()
    })

    const distinctProductIds = Array.from(
      new Set([
        ...input.diff.added.map((d) => d.form.productId),
        ...productChangedUpdates.map((u) => u.form.productId),
      ]),
    )
    const products = await Promise.all(
      distinctProductIds.map(async (productId) => ({
        productId,
        product: await getProductById(productId, c),
      })),
    )
    // Validate every product touched by the diff (added + product-change) still
    // exists. The unit FK is NOT seeded here — it's a user-managed, per-row value
    // the client fills on product select; the server persists only the form's own
    // value (UoM epic 2C). The product fetch remains for the reconnect below.
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
    }

    const addedWithIds = assignDraftIds(input.diff.added, randomUUID)

    return await applyWorkOrderMaterialItemsDiff(c, {
      workOrderId: input.workOrderId,
      actorEmail,
      added: addedWithIds.map((draft) => ({
        id: draft.id,
        tempId: draft.tempId,
        // Unit FK is the form's own value (client seeds on product select);
        // never re-seeded from the product here (mirrors modified below).
        input: { ...draft.form },
      })),
      modified: input.diff.modified.map((update) => {
        const existing = existingById.get(update.id)
        const productChanged =
          existing !== undefined &&
          update.form.productId.trim() !== existing.productId.trim()
        return {
          id: update.id,
          input: {
            quantity: update.form.quantity,
            notes: update.form.notes,
            // The unit is the user's own editable value — the server never
            // re-seeds it from the product (the client seeds on product change).
            unitId: update.form.unitId.trim() || "",
            // Reconnect the product FK only when it actually changed.
            ...(productChanged ? { product: { productId: update.form.productId } } : {}),
          },
        }
      }),
      deleted: input.diff.deleted.map((d) => ({ id: d.id })),
    })
  })
}
