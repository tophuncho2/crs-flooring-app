import { randomUUID } from "node:crypto"
import {
  applyTemplatePlannedPaymentsDiff,
  withDatabaseTransaction,
  type Prisma,
} from "@builders/db"
import {
  assignDraftIds,
  validateTemplatePlannedPaymentForm,
} from "@builders/domain"
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
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("saveTemplatePlannedPaymentsSectionUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

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

    return await applyTemplatePlannedPaymentsDiff(c, {
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
  })
}
