import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyWorkOrderMaterialItemsDiff,
  db,
  getProductById,
  listWorkOrderMaterialItems,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assignDraftIds,
  validateWorkOrderMaterialItemCreateForm,
  validateWorkOrderMaterialItemUpdateForm,
} from "@builders/domain"
import { assertActorEmail } from "../../shared/assert-actor-email.js"
import { guardProductsExist } from "../../shared/guard-products-exist.js"
import { WorkOrderMaterialItemExecutionError } from "./errors.js"
import type {
  SaveWorkOrderMaterialItemsSectionUseCaseInput,
  SaveWorkOrderMaterialItemsSectionUseCaseResult,
} from "./types.js"

/**
 * Diff-save use case mirroring the templates' MI section save:
 *  1. Validate every draft (create form) + update (update form).
 *  2. Pool pre-read the existing rows to detect product changes, then batch-guard
 *     every distinct product the diff touches (added + product-changed). The
 *     `unitId` is NOT seeded from the product (UoM epic 2C): it's a user-managed,
 *     per-row value the client fills on product select.
 *  3. Assign UUIDs to drafts via `assignDraftIds`.
 *  4. Apply the diff inside the transaction (lock-free — just the writes).
 *  5. Enrich the updated list on the pool after commit.
 *
 * The reads (pre-read + guard + enrich) run on the pool — a relation-rich read on
 * the pinned tx connection fires concurrent sub-queries and blows the tx timeout.
 *
 * Returns updated items + tempIdMap for the UI to reconcile draft state.
 */
export async function saveWorkOrderMaterialItemsSectionUseCase(
  input: SaveWorkOrderMaterialItemsSectionUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<SaveWorkOrderMaterialItemsSectionUseCaseResult> {
  assertActorEmail(actorEmail, "saveWorkOrderMaterialItemsSectionUseCase")

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

  // Pool pre-read (pre-write state; needs no uncommitted data) for product-change
  // detection. On the pool — a relation-rich read on the tx would trip concurrent
  // sub-queries on the pinned connection.
  const reader = client ?? db
  const existingRows = await listWorkOrderMaterialItems(input.workOrderId, reader)
  const existingById = new Map(existingRows.map((row) => [row.id, row]))

  // Rows whose product actually changed reconnect the product FK (the product is
  // freely editable now — no lock).
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
  // Validate every product touched by the diff (added + product-change) still
  // exists — on the pool (pure validation; the createMany/update FK backstops the
  // check→write window). The unit FK is NOT seeded here (UoM epic 2C).
  await guardProductsExist(
    distinctProductIds,
    (productId) => getProductById(productId, reader),
    (productId) =>
      new WorkOrderMaterialItemExecutionError({
        code: "WORK_ORDER_MATERIAL_ITEM_VALIDATION_FAILED",
        message: "Selected product was not found",
        status: 400,
        field: "productId",
        payload: { productId },
      }),
  )

  const addedWithIds = assignDraftIds(input.diff.added, randomUUID)

  const { tempIdMap } = await withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    return applyWorkOrderMaterialItemsDiff(c, {
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
          existing !== undefined && update.form.productId.trim() !== existing.productId.trim()
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

  // Enrich the updated list on the pool after commit.
  const items = await listWorkOrderMaterialItems(input.workOrderId, reader)
  return { items, tempIdMap }
}
