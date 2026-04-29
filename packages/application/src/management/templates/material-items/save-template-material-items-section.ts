import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyTemplateMaterialItemsDiff,
  getProductById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assignDraftIds,
  buildItemSendUnitSnapshotFromProduct,
  validateTemplateMaterialItemForm,
  type ItemSendUnitSnapshot,
} from "@builders/domain"
import { TemplateMaterialItemExecutionError } from "./errors.js"
import type {
  SaveTemplateMaterialItemsSectionUseCaseInput,
  SaveTemplateMaterialItemsSectionUseCaseResult,
} from "./types.js"

export async function saveTemplateMaterialItemsSectionUseCase(
  input: SaveTemplateMaterialItemsSectionUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<SaveTemplateMaterialItemsSectionUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    for (const draft of input.diff.added) {
      const validationError = validateTemplateMaterialItemForm(draft.form)
      if (validationError) {
        throw new TemplateMaterialItemExecutionError({
          code: "TEMPLATE_MATERIAL_ITEM_VALIDATION_FAILED",
          message: validationError,
          status: 400,
          payload: { refKind: "tempId", ref: draft.tempId },
        })
      }
    }

    for (const update of input.diff.modified) {
      const validationError = validateTemplateMaterialItemForm(update.form)
      if (validationError) {
        throw new TemplateMaterialItemExecutionError({
          code: "TEMPLATE_MATERIAL_ITEM_VALIDATION_FAILED",
          message: validationError,
          status: 400,
          payload: { refKind: "id", ref: update.id },
        })
      }
    }

    // Batch-fetch every distinct product touched by the diff (added + modified).
    // Each entry needs the product's send-unit snapshot stamped on its row at
    // write time. One query per distinct product — bounded by the number of
    // unique products in this user's save action (typically small).
    const distinctProductIds = Array.from(
      new Set([
        ...input.diff.added.map((d) => d.form.productId),
        ...input.diff.modified.map((m) => m.form.productId),
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
        throw new TemplateMaterialItemExecutionError({
          code: "TEMPLATE_MATERIAL_ITEM_VALIDATION_FAILED",
          message: "Selected product was not found",
          status: 400,
          field: "productId",
          payload: { productId: entry.productId },
        })
      }
      snapshotByProductId.set(entry.productId, buildItemSendUnitSnapshotFromProduct(entry.product))
    }

    const addedWithIds = assignDraftIds(input.diff.added, randomUUID)

    return applyTemplateMaterialItemsDiff(c, {
      templateId: input.templateId,
      added: addedWithIds.map((draft) => ({
        id: draft.id,
        tempId: draft.tempId,
        input: { ...draft.form, ...snapshotByProductId.get(draft.form.productId)! },
      })),
      modified: input.diff.modified.map((update) => ({
        id: update.id,
        input: { ...update.form, ...snapshotByProductId.get(update.form.productId)! },
      })),
      deleted: input.diff.deleted.map((d) => ({ id: d.id })),
    })
  })
}
