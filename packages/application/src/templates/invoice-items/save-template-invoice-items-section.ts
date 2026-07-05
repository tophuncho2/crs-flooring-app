import { randomUUID } from "node:crypto"
import {
  applyTemplateInvoiceItemsDiff,
  withDatabaseTransaction,
  Prisma,
} from "@builders/db"
import {
  assignDraftIds,
  validateTemplateInvoiceItemForm,
} from "@builders/domain"
import { TemplateInvoiceItemExecutionError } from "./errors.js"
import type {
  SaveTemplateInvoiceItemsSectionUseCaseInput,
  SaveTemplateInvoiceItemsSectionUseCaseResult,
} from "./types.js"

export async function saveTemplateInvoiceItemsSectionUseCase(
  input: SaveTemplateInvoiceItemsSectionUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<SaveTemplateInvoiceItemsSectionUseCaseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("saveTemplateInvoiceItemsSectionUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    for (const draft of input.diff.added) {
      const validationError = validateTemplateInvoiceItemForm(draft.form)
      if (validationError) {
        throw new TemplateInvoiceItemExecutionError({
          code: "TEMPLATE_INVOICE_ITEM_VALIDATION_FAILED",
          message: validationError,
          status: 400,
          payload: { refKind: "tempId", ref: draft.tempId },
        })
      }
    }

    for (const update of input.diff.modified) {
      const validationError = validateTemplateInvoiceItemForm(update.form)
      if (validationError) {
        throw new TemplateInvoiceItemExecutionError({
          code: "TEMPLATE_INVOICE_ITEM_VALIDATION_FAILED",
          message: validationError,
          status: 400,
          payload: { refKind: "id", ref: update.id },
        })
      }
    }

    const addedWithIds = assignDraftIds(input.diff.added, randomUUID)

    return applyTemplateInvoiceItemsDiff(c, {
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
