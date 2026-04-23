import { randomUUID } from "node:crypto"
import { Prisma, applyTemplateMaterialItemsDiff, withDatabaseTransaction } from "@builders/db"
import { assignDiffIds, validateTemplateMaterialItemForm } from "@builders/domain"
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

    const addedWithIds = assignDiffIds(input.diff.added, randomUUID)

    return applyTemplateMaterialItemsDiff(c, {
      templateId: input.templateId,
      added: addedWithIds.map((draft) => ({
        id: draft.id,
        tempId: draft.tempId,
        form: draft.form,
      })),
      modified: input.diff.modified.map((update) => ({
        id: update.id,
        form: update.form,
      })),
      deleted: input.diff.deleted.map((d) => ({ id: d.id })),
    })
  })
}
