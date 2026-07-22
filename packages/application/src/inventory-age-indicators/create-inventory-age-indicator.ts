import {
  Prisma,
  createInventoryAgeIndicatorRecord,
  withDatabaseTransaction,
} from "@builders/db"
import {
  INVENTORY_AGE_INDICATOR_DAYS_CONFLICT_MESSAGE,
  INVENTORY_AGE_INDICATOR_DAYS_INVALID_MESSAGE,
  INVENTORY_AGE_INDICATOR_DAYS_MAX,
  INVENTORY_AGE_INDICATOR_DAYS_MIN,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2002 } from "../shared/prisma-errors.js"
import { InventoryAgeIndicatorExecutionError } from "./errors.js"
import type {
  CreateInventoryAgeIndicatorUseCaseInput,
  InventoryAgeIndicatorUseCaseResult,
} from "./types.js"

export async function createInventoryAgeIndicatorUseCase(
  input: CreateInventoryAgeIndicatorUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<InventoryAgeIndicatorUseCaseResult> {
  assertActorEmail(actorEmail, "createInventoryAgeIndicatorUseCase")

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (
      !Number.isInteger(input.days) ||
      input.days < INVENTORY_AGE_INDICATOR_DAYS_MIN ||
      input.days > INVENTORY_AGE_INDICATOR_DAYS_MAX
    ) {
      throw new InventoryAgeIndicatorExecutionError({
        code: "INVENTORY_AGE_INDICATOR_VALIDATION_FAILED",
        message: INVENTORY_AGE_INDICATOR_DAYS_INVALID_MESSAGE,
        status: 400,
        field: "days",
      })
    }

    try {
      return await createInventoryAgeIndicatorRecord(
        { ...input, createdBy: actorEmail, updatedBy: actorEmail },
        c,
      )
    } catch (error) {
      if (isP2002(error, "days")) {
        throw new InventoryAgeIndicatorExecutionError({
          code: "INVENTORY_AGE_INDICATOR_DAYS_CONFLICT",
          message: INVENTORY_AGE_INDICATOR_DAYS_CONFLICT_MESSAGE,
          status: 409,
          field: "days",
        })
      }
      throw error
    }
  })
}
