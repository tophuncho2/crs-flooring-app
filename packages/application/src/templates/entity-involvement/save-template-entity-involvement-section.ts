import { randomUUID } from "node:crypto"
import {
  applyTemplateEntityInvolvementsDiff,
  db,
  listTemplateEntityInvolvements,
  withDatabaseTransaction,
  Prisma,
} from "@builders/db"
import {
  assignDraftIds,
  validateTemplateEntityInvolvementForm,
} from "@builders/domain"
import { assertActorEmail } from "../../shared/assert-actor-email.js"
import { isP2003 } from "../../shared/prisma-errors.js"
import { TemplateEntityInvolvementExecutionError } from "./errors.js"
import type {
  SaveTemplateEntityInvolvementSectionUseCaseInput,
  SaveTemplateEntityInvolvementSectionUseCaseResult,
} from "./types.js"

export async function saveTemplateEntityInvolvementSectionUseCase(
  input: SaveTemplateEntityInvolvementSectionUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<SaveTemplateEntityInvolvementSectionUseCaseResult> {
  assertActorEmail(actorEmail, "saveTemplateEntityInvolvementSectionUseCase")

  // No required fields today (the rule is a no-op), but keep the validation loop
  // as the section's seam so a future rule attributes errors to the right row.
  for (const draft of input.diff.added) {
    const validationError = validateTemplateEntityInvolvementForm(draft.form)
    if (validationError) {
      throw new TemplateEntityInvolvementExecutionError({
        code: "TEMPLATE_ENTITY_INVOLVEMENT_VALIDATION_FAILED",
        message: validationError,
        status: 400,
        payload: { refKind: "tempId", ref: draft.tempId },
      })
    }
  }

  for (const update of input.diff.modified) {
    const validationError = validateTemplateEntityInvolvementForm(update.form)
    if (validationError) {
      throw new TemplateEntityInvolvementExecutionError({
        code: "TEMPLATE_ENTITY_INVOLVEMENT_VALIDATION_FAILED",
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
      return applyTemplateEntityInvolvementsDiff(c, {
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
    // A linked entity id that points at no row trips the FK (P2003). Optional
    // link, no pre-guard — the FK is the only backstop.
    if (isP2003(error)) {
      throw new TemplateEntityInvolvementExecutionError({
        code: "TEMPLATE_ENTITY_INVOLVEMENT_LINK_INVALID",
        message: "Linked entity could not be found.",
        status: 400,
        field: "entityId",
      })
    }
    throw error
  }

  // Enrich the updated list on the pool after commit.
  const entityInvolvements = await listTemplateEntityInvolvements(input.templateId, client ?? db)
  return { entityInvolvements, tempIdMap }
}
