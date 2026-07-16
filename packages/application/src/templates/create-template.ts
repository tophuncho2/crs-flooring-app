import { Prisma, createTemplateRecord, getTemplateById } from "@builders/db"
import { TEMPLATE_UNIT_TYPE_REQUIRED_MESSAGE } from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { withTxThenEnrich } from "../shared/with-tx-then-enrich.js"
import { TemplateExecutionError } from "./errors.js"
import type { CreateTemplateUseCaseInput, TemplateUseCaseResult } from "./types.js"

export async function createTemplateUseCase(
  input: CreateTemplateUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<TemplateUseCaseResult> {
  assertActorEmail(actorEmail, "createTemplateUseCase")

  // Property is optional — a template always has an auto-generated number, so
  // there is no "empty record" to guard against. Unit type stays required. This
  // is pure validation (no DB), so it runs before opening the transaction.
  if (!input.unitType || !input.unitType.trim()) {
    throw new TemplateExecutionError({
      code: "TEMPLATE_VALIDATION_FAILED",
      message: TEMPLATE_UNIT_TYPE_REQUIRED_MESSAGE,
      status: 400,
      field: "unitType",
    })
  }

  // The write runs lean in the tx; the full (5-6 relation) record is read on the
  // pool after commit.
  return withTxThenEnrich(
    (c) => createTemplateRecord({ ...input, createdBy: actorEmail, updatedBy: actorEmail }, c),
    ({ id }) => getTemplateById(id, { withNeighbors: false }),
    () => {
      throw new Error("createTemplateUseCase: template not found after insert")
    },
    { client },
  )
}
