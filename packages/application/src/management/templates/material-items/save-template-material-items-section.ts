import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyTemplateMaterialItemsDiff,
  getProductById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assignDraftIds,
  validateTemplateMaterialItemForm,
} from "@builders/domain"
import { TemplateMaterialItemExecutionError } from "./errors.js"
import type {
  SaveTemplateMaterialItemsSectionUseCaseInput,
  SaveTemplateMaterialItemsSectionUseCaseResult,
} from "./types.js"

export async function saveTemplateMaterialItemsSectionUseCase(
  input: SaveTemplateMaterialItemsSectionUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<SaveTemplateMaterialItemsSectionUseCaseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("saveTemplateMaterialItemsSectionUseCase requires a non-empty actorEmail")
  }

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

    // Batch-fetch every distinct product touched by the diff (added + modified)
    // to (a) validate it exists and (b) seed the item's `unitId` from the
    // product's own unit when the form left it blank (UoM epic 2C). The form's
    // own editable `unitId` takes precedence — the client seeds it on product
    // select and re-seeds on product change. One query per distinct product.
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
    const unitIdByProductId = new Map<string, string>()
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
      unitIdByProductId.set(entry.productId, entry.product.unitId)
    }

    // Seed the item's unit FK from the product's unit when the form left it
    // blank — ADDED rows only (a convenience default on create; UoM epic 2C).
    // The form's own editable value takes precedence.
    const seedAddedUnitId = (form: { productId: string; unitId: string }) =>
      form.unitId.trim() || unitIdByProductId.get(form.productId) || ""

    const addedWithIds = assignDraftIds(input.diff.added, randomUUID)

    return await applyTemplateMaterialItemsDiff(c, {
      templateId: input.templateId,
      actorEmail,
      added: addedWithIds.map((draft) => ({
        id: draft.id,
        tempId: draft.tempId,
        input: { ...draft.form, unitId: seedAddedUnitId(draft.form) },
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
