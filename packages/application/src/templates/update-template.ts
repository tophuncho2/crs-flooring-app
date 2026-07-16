import { Prisma, getTemplateById, updateTemplateRecord } from "@builders/db"
import {
  TEMPLATE_NOT_FOUND_MESSAGE,
  TEMPLATE_UNIT_TYPE_REQUIRED_MESSAGE,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2025 } from "../shared/prisma-errors.js"
import { withTxThenEnrich } from "../shared/with-tx-then-enrich.js"
import { TemplateExecutionError } from "./errors.js"
import type { TemplateUseCaseResult, UpdateTemplateUseCaseInput } from "./types.js"

function templateNotFound(): TemplateExecutionError {
  return new TemplateExecutionError({
    code: "TEMPLATE_NOT_FOUND",
    message: TEMPLATE_NOT_FOUND_MESSAGE,
    status: 404,
  })
}

export async function updateTemplateUseCase(
  id: string,
  input: UpdateTemplateUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<TemplateUseCaseResult> {
  assertActorEmail(actorEmail, "updateTemplateUseCase")

  // Property is optional and freely clearable — passing `null` detaches it.
  // Unit type, when supplied, must still be non-empty. Pure validation runs
  // before the transaction.
  if (input.unitType !== undefined && !input.unitType.trim()) {
    throw new TemplateExecutionError({
      code: "TEMPLATE_VALIDATION_FAILED",
      message: TEMPLATE_UNIT_TYPE_REQUIRED_MESSAGE,
      status: 400,
      field: "unitType",
    })
  }

  // The write runs lean in the tx; the full record is read on the pool after
  // commit.
  try {
    return await withTxThenEnrich(
      (c) => updateTemplateRecord(id, { ...input, updatedBy: actorEmail }, c),
      () => getTemplateById(id, { withNeighbors: false }),
      () => {
        throw templateNotFound()
      },
      { client },
    )
  } catch (error) {
    // The in-tx `.update` throws P2025 when the row is gone.
    if (isP2025(error)) {
      throw templateNotFound()
    }
    throw error
  }
}
