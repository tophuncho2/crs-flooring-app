import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyTemplateMaterialItemsDiff,
  getProductById,
  listTemplateMaterialItems,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assignDraftIds,
  buildItemSendUnitSnapshotFromProduct,
  buildTemplateMaterialItemDuplicateProductMessage,
  findDuplicateProductId,
  validateTemplateMaterialItemForm,
  type ItemSendUnitSnapshot,
} from "@builders/domain"
import { TemplateMaterialItemExecutionError } from "./errors.js"
import type {
  SaveTemplateMaterialItemsSectionUseCaseInput,
  SaveTemplateMaterialItemsSectionUseCaseResult,
} from "./types.js"

function throwDuplicateProduct(productId?: string): never {
  throw new TemplateMaterialItemExecutionError({
    code: "TEMPLATE_MATERIAL_ITEM_DUPLICATE_PRODUCT",
    message: buildTemplateMaterialItemDuplicateProductMessage(),
    status: 409,
    field: "productId",
    ...(productId ? { payload: { productId } } : {}),
  })
}

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

    // One product per template. Build the productId set that will exist
    // after this diff applies — existing rows that survive deletion and
    // are not being re-pointed, plus added rows and the (possibly new)
    // product of each modified row — and reject the first repeat. Template
    // items allow product change on update, so modified rows contribute
    // their NEW product here. The DB @@unique is the canonical guard.
    const existingRows = await listTemplateMaterialItems(input.templateId, c)
    const deletedIds = new Set(input.diff.deleted.map((d) => d.id))
    const modifiedIds = new Set(input.diff.modified.map((m) => m.id))
    const duplicate = findDuplicateProductId([
      ...existingRows
        .filter((row) => !deletedIds.has(row.id) && !modifiedIds.has(row.id))
        .map((row) => row.productId),
      ...input.diff.added.map((d) => d.form.productId),
      ...input.diff.modified.map((m) => m.form.productId),
    ])
    if (duplicate) throwDuplicateProduct(duplicate)

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

    try {
      return await applyTemplateMaterialItemsDiff(c, {
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
