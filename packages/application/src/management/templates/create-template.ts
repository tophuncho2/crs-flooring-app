import { Prisma, createTemplateRecord, withDatabaseTransaction } from "@builders/db"
import { TEMPLATE_UNIT_TYPE_REQUIRED_MESSAGE } from "@builders/domain"
import { TemplateExecutionError } from "./errors.js"
import type { CreateTemplateUseCaseInput, TemplateUseCaseResult } from "./types.js"

export async function createTemplateUseCase(
  input: CreateTemplateUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<TemplateUseCaseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("createTemplateUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // Property is optional — a template always has an auto-generated number, so
    // there is no "empty record" to guard against. Unit type stays required.
    if (!input.unitType || !input.unitType.trim()) {
      throw new TemplateExecutionError({
        code: "TEMPLATE_VALIDATION_FAILED",
        message: TEMPLATE_UNIT_TYPE_REQUIRED_MESSAGE,
        status: 400,
        field: "unitType",
      })
    }

    return createTemplateRecord({ ...input, createdBy: actorEmail, updatedBy: actorEmail }, c)
  })
}
