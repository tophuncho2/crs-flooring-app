import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyWorkOrderMaterialItemsDiff,
  countCutLogsByWorkOrderItemIds,
  getProductById,
  listWorkOrderMaterialItems,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assignDraftIds,
  buildItemSendUnitSnapshotFromProduct,
  buildWorkOrderMaterialItemDuplicateProductMessage,
  buildWorkOrderMaterialItemProductLockedMessage,
  findDuplicateProductId,
  isWorkOrderMaterialItemProductChangeBlocked,
  validateWorkOrderMaterialItemCreateForm,
  validateWorkOrderMaterialItemUpdateForm,
  type ItemSendUnitSnapshot,
} from "@builders/domain"
import { WorkOrderMaterialItemExecutionError } from "./errors.js"
import type {
  SaveWorkOrderMaterialItemsSectionUseCaseInput,
  SaveWorkOrderMaterialItemsSectionUseCaseResult,
} from "./types.js"

function throwDuplicateProduct(productId?: string): never {
  throw new WorkOrderMaterialItemExecutionError({
    code: "WORK_ORDER_MATERIAL_ITEM_DUPLICATE_PRODUCT",
    message: buildWorkOrderMaterialItemDuplicateProductMessage(),
    status: 409,
    field: "productId",
    ...(productId ? { payload: { productId } } : {}),
  })
}

/**
 * Diff-save use case mirroring the templates' MI section save:
 *  1. Validate every draft (create form) + update (update form).
 *  2. Reject a product change on any modified row that already has cut logs
 *     (product is editable only until the item is linked to a cut log).
 *  3. Batch-fetch every distinct product the `added` drafts AND the
 *     product-changed `modified` rows touch, and stamp the send-unit snapshot
 *     via `buildItemSendUnitSnapshotFromProduct`. Modified rows whose product
 *     is unchanged keep their stored snapshot.
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

    const existingRows = await listWorkOrderMaterialItems(input.workOrderId, c)
    const existingById = new Map(existingRows.map((row) => [row.id, row]))
    const deletedIds = new Set(input.diff.deleted.map((d) => d.id))

    // Product is editable until the item has cut logs. Reject a product change
    // on any modified row that already has (non-void) cut logs.
    const productChangedUpdates = input.diff.modified.filter((update) => {
      const existing = existingById.get(update.id)
      return existing !== undefined && update.form.productId.trim() !== existing.productId.trim()
    })
    if (productChangedUpdates.length > 0) {
      const cutLogCounts = await countCutLogsByWorkOrderItemIds(
        productChangedUpdates.map((u) => u.id),
        c,
      )
      for (const update of productChangedUpdates) {
        const existing = existingById.get(update.id)!
        const hasCutLogs = (cutLogCounts.get(update.id) ?? 0) > 0
        if (
          isWorkOrderMaterialItemProductChangeBlocked(
            hasCutLogs,
            existing.productId,
            update.form.productId,
          )
        ) {
          throw new WorkOrderMaterialItemExecutionError({
            code: "WORK_ORDER_MATERIAL_ITEM_PRODUCT_LOCKED",
            message: buildWorkOrderMaterialItemProductLockedMessage(),
            status: 409,
            field: "productId",
            payload: { refKind: "id", ref: update.id },
          })
        }
      }
    }

    // One product per work order. Build the productId set that will exist
    // after this diff applies — surviving existing rows (with any modified
    // row's NEW product) plus added rows — and reject the first repeat. The
    // DB @@unique is the canonical guard; this yields a precise error first.
    const modifiedProductById = new Map(
      input.diff.modified.map((update) => [update.id, update.form.productId]),
    )
    const duplicate = findDuplicateProductId([
      ...existingRows
        .filter((row) => !deletedIds.has(row.id))
        .map((row) => modifiedProductById.get(row.id) ?? row.productId),
      ...input.diff.added.map((d) => d.form.productId),
    ])
    if (duplicate) throwDuplicateProduct(duplicate)

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

    try {
      return await applyWorkOrderMaterialItemsDiff(c, {
        workOrderId: input.workOrderId,
        added: addedWithIds.map((draft) => ({
          id: draft.id,
          tempId: draft.tempId,
          input: { ...draft.form, ...snapshotByProductId.get(draft.form.productId)! },
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
              // Re-snapshot send units only when the product actually changed;
              // unchanged rows keep their stored snapshot untouched.
              ...(productChanged
                ? {
                    product: {
                      productId: update.form.productId,
                      ...snapshotByProductId.get(update.form.productId)!,
                    },
                  }
                : {}),
            },
          }
        }),
        deleted: input.diff.deleted.map((d) => ({ id: d.id })),
      })
    } catch (error) {
      // Race safety net: a concurrent save could slip a duplicate past the
      // pre-check above. The unique index raises P2002 — map it to the same
      // friendly conflict.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throwDuplicateProduct()
      }
      throw error
    }
  })
}
