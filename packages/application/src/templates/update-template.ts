import { Prisma, updateTemplateRecord, withDatabaseTransaction } from "@builders/db"
import {
  TEMPLATE_NOT_FOUND_MESSAGE,
  TEMPLATE_UNIT_TYPE_REQUIRED_MESSAGE,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2025 } from "../shared/prisma-errors.js"
import { TemplateExecutionError } from "./errors.js"
import type { TemplateUseCaseResult, UpdateTemplateUseCaseInput } from "./types.js"

export async function updateTemplateUseCase(
  id: string,
  input: UpdateTemplateUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<TemplateUseCaseResult> {
  assertActorEmail(actorEmail, "updateTemplateUseCase")

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // Property is optional and freely clearable — passing `null` detaches it.
    // Unit type, when supplied, must still be non-empty.
    if (input.unitType !== undefined && !input.unitType.trim()) {
      throw new TemplateExecutionError({
        code: "TEMPLATE_VALIDATION_FAILED",
        message: TEMPLATE_UNIT_TYPE_REQUIRED_MESSAGE,
        status: 400,
        field: "unitType",
      })
    }

    try {
      return await updateTemplateRecord(id, { ...input, updatedBy: actorEmail }, c)
    } catch (error) {
      if (isP2025(error)) {
        throw new TemplateExecutionError({
          code: "TEMPLATE_NOT_FOUND",
          message: TEMPLATE_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
