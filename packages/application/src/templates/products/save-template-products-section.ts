import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyTemplateCommissionsDiff,
  applyTemplatePlannedProductsDiff,
  applyTemplateServiceItemsDiff,
  db,
  getProductById,
  listTemplateCommissions,
  listTemplatePlannedProducts,
  listTemplateServiceItems,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assignDraftIds,
  validateTemplateCommissionForm,
  validateTemplatePlannedProductForm,
  validateTemplateServiceItemForm,
} from "@builders/domain"
import { assertActorEmail } from "../../shared/assert-actor-email.js"
import { guardProductsExist } from "../../shared/guard-products-exist.js"
import { TemplateCommissionExecutionError } from "../commissions/errors.js"
import { TemplatePlannedProductExecutionError } from "../planned-products/errors.js"
import { TemplateServiceItemExecutionError } from "../service-items/errors.js"
import type {
  SaveTemplateProductsSectionUseCaseInput,
  SaveTemplateProductsSectionUseCaseResult,
} from "./types.js"

/**
 * Diff-save use case for the templates' "products" section — THREE editable tables
 * (planned products + service / misc items + commissions) reconciled in ONE atomic diff:
 *  1. Validate every draft + update on ALL tables.
 *  2. Batch-guard every distinct planned product the diff touches — on the pool.
 *     (Service items + commissions have no product, so no guard.)
 *  3. Assign UUIDs to drafts on all tables via `assignDraftIds`.
 *  4. Apply every diff inside ONE transaction (lock-free — just the writes). One
 *     transaction so a single Save is all-or-nothing across every table (and one
 *     round-trip). NOTE: child-row writes never bump the parent `template.updatedAt`,
 *     so the route's optimistic-concurrency token only catches a concurrent PARENT
 *     edit, not concurrent child edits — atomicity is the reason to combine, not the
 *     token.
 *  5. Enrich both updated lists on the pool after commit.
 *
 * The reads (guard + enrich) run on the pool — a relation-rich read on the pinned
 * tx connection fires concurrent sub-queries and blows the tx timeout.
 */
export async function saveTemplateProductsSectionUseCase(
  input: SaveTemplateProductsSectionUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<SaveTemplateProductsSectionUseCaseResult> {
  assertActorEmail(actorEmail, "saveTemplateProductsSectionUseCase")

  // Validate planned products.
  for (const draft of input.plannedProducts.added) {
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
  for (const update of input.plannedProducts.modified) {
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

  // Validate service items.
  for (const draft of input.serviceItems.added) {
    const validationError = validateTemplateServiceItemForm(draft.form)
    if (validationError) {
      throw new TemplateServiceItemExecutionError({
        code: "TEMPLATE_SERVICE_ITEM_VALIDATION_FAILED",
        message: validationError,
        status: 400,
        payload: { refKind: "tempId", ref: draft.tempId },
      })
    }
  }
  for (const update of input.serviceItems.modified) {
    const validationError = validateTemplateServiceItemForm(update.form)
    if (validationError) {
      throw new TemplateServiceItemExecutionError({
        code: "TEMPLATE_SERVICE_ITEM_VALIDATION_FAILED",
        message: validationError,
        status: 400,
        payload: { refKind: "id", ref: update.id },
      })
    }
  }

  // Validate commissions.
  for (const draft of input.commissions.added) {
    const validationError = validateTemplateCommissionForm(draft.form)
    if (validationError) {
      throw new TemplateCommissionExecutionError({
        code: "TEMPLATE_COMMISSION_VALIDATION_FAILED",
        message: validationError,
        status: 400,
        payload: { refKind: "tempId", ref: draft.tempId },
      })
    }
  }
  for (const update of input.commissions.modified) {
    const validationError = validateTemplateCommissionForm(update.form)
    if (validationError) {
      throw new TemplateCommissionExecutionError({
        code: "TEMPLATE_COMMISSION_VALIDATION_FAILED",
        message: validationError,
        status: 400,
        payload: { refKind: "id", ref: update.id },
      })
    }
  }

  // Batch-fetch every distinct planned product touched by the diff (added +
  // modified) to validate it still exists — on the pool. Service items carry no
  // product, so they're excluded. One query per product.
  const reader = client ?? db
  const distinctProductIds = Array.from(
    new Set([
      ...input.plannedProducts.added.map((d) => d.form.productId),
      ...input.plannedProducts.modified.map((m) => m.form.productId),
    ]),
  )
  await guardProductsExist(
    distinctProductIds,
    (productId) => getProductById(productId, reader),
    (productId) =>
      new TemplatePlannedProductExecutionError({
        code: "TEMPLATE_PLANNED_PRODUCT_VALIDATION_FAILED",
        message: "Selected product was not found",
        status: 400,
        field: "productId",
        payload: { productId },
      }),
  )

  const plannedAdded = assignDraftIds(input.plannedProducts.added, randomUUID)
  const serviceAdded = assignDraftIds(input.serviceItems.added, randomUUID)
  const commissionAdded = assignDraftIds(input.commissions.added, randomUUID)

  const { tempIdMap } = await withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    // Pass each form's own `unitId` through unchanged so an explicit clear ("")
    // reaches the repo (→ NULL); never re-seed on modify.
    const planned = await applyTemplatePlannedProductsDiff(c, {
      templateId: input.templateId,
      actorEmail,
      added: plannedAdded.map((draft) => ({
        id: draft.id,
        tempId: draft.tempId,
        input: { ...draft.form },
      })),
      modified: input.plannedProducts.modified.map((update) => ({
        id: update.id,
        input: { ...update.form },
      })),
      deleted: input.plannedProducts.deleted.map((d) => ({ id: d.id })),
    })
    const service = await applyTemplateServiceItemsDiff(c, {
      templateId: input.templateId,
      actorEmail,
      added: serviceAdded.map((draft) => ({
        id: draft.id,
        tempId: draft.tempId,
        input: { ...draft.form },
      })),
      modified: input.serviceItems.modified.map((update) => ({
        id: update.id,
        input: { ...update.form },
      })),
      deleted: input.serviceItems.deleted.map((d) => ({ id: d.id })),
    })
    const commission = await applyTemplateCommissionsDiff(c, {
      templateId: input.templateId,
      actorEmail,
      added: commissionAdded.map((draft) => ({
        id: draft.id,
        tempId: draft.tempId,
        input: { ...draft.form },
      })),
      modified: input.commissions.modified.map((update) => ({
        id: update.id,
        input: { ...update.form },
      })),
      deleted: input.commissions.deleted.map((d) => ({ id: d.id })),
    })
    return {
      tempIdMap: { ...planned.tempIdMap, ...service.tempIdMap, ...commission.tempIdMap },
    }
  })

  // Enrich all three updated lists on the pool after commit.
  const plannedProducts = await listTemplatePlannedProducts(input.templateId, reader)
  const serviceItems = await listTemplateServiceItems(input.templateId, reader)
  const commissions = await listTemplateCommissions(input.templateId, reader)
  return { plannedProducts, serviceItems, commissions, tempIdMap }
}
