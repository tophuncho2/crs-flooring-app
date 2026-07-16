import { randomUUID } from "node:crypto"
import {
  applyTemplatePlannedPaymentsDiff,
  db,
  listTemplatePlannedPayments,
  withDatabaseTransaction,
  Prisma,
} from "@builders/db"
import {
  assignDraftIds,
  validateTemplatePlannedPaymentForm,
} from "@builders/domain"
import { assertActorEmail } from "../../shared/assert-actor-email.js"
import { isP2003, p2003FieldName } from "../../shared/prisma-errors.js"
import { TemplatePlannedPaymentExecutionError } from "./errors.js"
import type {
  SaveTemplatePlannedPaymentsSectionUseCaseInput,
  SaveTemplatePlannedPaymentsSectionUseCaseResult,
} from "./types.js"

export async function saveTemplatePlannedPaymentsSectionUseCase(
  input: SaveTemplatePlannedPaymentsSectionUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<SaveTemplatePlannedPaymentsSectionUseCaseResult> {
  assertActorEmail(actorEmail, "saveTemplatePlannedPaymentsSectionUseCase")

  for (const draft of input.diff.added) {
    const validationError = validateTemplatePlannedPaymentForm(draft.form)
    if (validationError) {
      throw new TemplatePlannedPaymentExecutionError({
        code: "TEMPLATE_PLANNED_PAYMENT_VALIDATION_FAILED",
        message: validationError,
        status: 400,
        payload: { refKind: "tempId", ref: draft.tempId },
      })
    }
  }

  for (const update of input.diff.modified) {
    const validationError = validateTemplatePlannedPaymentForm(update.form)
    if (validationError) {
      throw new TemplatePlannedPaymentExecutionError({
        code: "TEMPLATE_PLANNED_PAYMENT_VALIDATION_FAILED",
        message: validationError,
        status: 400,
        payload: { refKind: "id", ref: update.id },
      })
    }
  }

  const addedWithIds = assignDraftIds(input.diff.added, randomUUID)

  let tempIdMap: Record<string, string>
  try {
    ;({ tempIdMap } = await withDatabaseTransaction(async (tx) => {
      const c = client ?? tx
      return applyTemplatePlannedPaymentsDiff(c, {
        templateId: input.templateId,
        actorEmail,
        added: addedWithIds.map((draft) => ({
          id: draft.id,
          tempId: draft.tempId,
          input: { ...draft.form },
        })),
        modified: input.diff.modified.map((update) => ({
          id: update.id,
          input: { ...update.form },
        })),
        deleted: input.diff.deleted.map((d) => ({ id: d.id })),
      })
    }))
  } catch (error) {
    // A linked id (entity or payment purpose) that points at no row trips the
    // FK (P2003). Optional links, no pre-guard — the FK is the backstop.
    // Attribute the failure to the right field via the P2003 field_name.
    if (isP2003(error)) {
      const isPurpose = p2003FieldName(error)?.includes("paymentpurpose") ?? false
      throw new TemplatePlannedPaymentExecutionError({
        code: "TEMPLATE_PLANNED_PAYMENT_LINK_INVALID",
        message: isPurpose
          ? "Linked payment purpose could not be found."
          : "Linked entity could not be found.",
        status: 400,
        field: isPurpose ? "paymentPurposeId" : "entityId",
      })
    }
    throw error
  }

  // Enrich the updated list on the pool after commit.
  const plannedPayments = await listTemplatePlannedPayments(input.templateId, client ?? db)
  return { plannedPayments, tempIdMap }
}
