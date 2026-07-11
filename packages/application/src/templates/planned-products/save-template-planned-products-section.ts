import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyTemplatePlannedProductsDiff,
  getProductById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assignDraftIds,
  validateTemplatePlannedProductForm,
} from "@builders/domain"
import { assertActorEmail } from "../../shared/assert-actor-email.js"
import { guardProductsExist } from "../../shared/guard-products-exist.js"
import { TemplatePlannedProductExecutionError } from "./errors.js"
import type {
  SaveTemplatePlannedProductsSectionUseCaseInput,
  SaveTemplatePlannedProductsSectionUseCaseResult,
} from "./types.js"

export async function saveTemplatePlannedProductsSectionUseCase(
  input: SaveTemplatePlannedProductsSectionUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<SaveTemplatePlannedProductsSectionUseCaseResult> {
  assertActorEmail(actorEmail, "saveTemplatePlannedProductsSectionUseCase")

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    for (const draft of input.diff.added) {
      const validationError = validateTemplatePlannedProductForm(draft.form)
      if (validationError) {
        throw new TemplatePlannedProductExecutionError({
          code: "TEMPLATE_PLANNED_PRODUCT_VALIDATION_FAILED",
          message: validationError,
          status: 400,
          payload: { refKind: "tempId", ref: draft.tempId },
        })
      }
    }

    for (const update of input.diff.modified) {
      const validationError = validateTemplatePlannedProductForm(update.form)
      if (validationError) {
        throw new TemplatePlannedProductExecutionError({
          code: "TEMPLATE_PLANNED_PRODUCT_VALIDATION_FAILED",
          message: validationError,
          status: 400,
          payload: { refKind: "id", ref: update.id },
        })
      }
    }

    // Batch-fetch every distinct product touched by the diff (added + modified)
    // to validate it still exists. The unit FK is NOT seeded here — it's a
    // user-managed, per-row value the client fills on product select; the server
    // persists only what the form sends (UoM epic 2C). One query per product.
    const distinctProductIds = Array.from(
      new Set([
        ...input.diff.added.map((d) => d.form.productId),
        ...input.diff.modified.map((m) => m.form.productId),
      ]),
    )
    await guardProductsExist(
      distinctProductIds,
      (productId) => getProductById(productId, c),
      (productId) =>
        new TemplatePlannedProductExecutionError({
          code: "TEMPLATE_PLANNED_PRODUCT_VALIDATION_FAILED",
          message: "Selected product was not found",
          status: 400,
          field: "productId",
          payload: { productId },
        }),
    )

    const addedWithIds = assignDraftIds(input.diff.added, randomUUID)

    return await applyTemplatePlannedProductsDiff(c, {
      templateId: input.templateId,
      actorEmail,
      added: addedWithIds.map((draft) => ({
        id: draft.id,
        tempId: draft.tempId,
        // Unit FK is the form's own value (client seeds on product select);
        // never re-seeded from the product here (mirrors modified below).
        input: { ...draft.form },
      })),
      // MODIFIED: pass the form's own `unitId` through unchanged so an explicit
      // clear ("") reaches the repo (→ NULL). Never re-seed from the product on
      // modify — the client already re-seeds on product change, and re-seeding
      // here silently defeats the user's clear. (Mirrors WO material-items +
      // imports staged rows.)
      modified: input.diff.modified.map((update) => ({
        id: update.id,
        input: { ...update.form },
      })),
      deleted: input.diff.deleted.map((d) => ({ id: d.id })),
    })
  })
}
