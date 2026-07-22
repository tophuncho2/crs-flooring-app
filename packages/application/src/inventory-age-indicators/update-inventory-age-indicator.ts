import {
  Prisma,
  updateInventoryAgeIndicatorRecord,
  withDatabaseTransaction,
} from "@builders/db"
import {
  INVENTORY_AGE_INDICATOR_DAYS_CONFLICT_MESSAGE,
  INVENTORY_AGE_INDICATOR_DAYS_INVALID_MESSAGE,
  INVENTORY_AGE_INDICATOR_DAYS_MAX,
  INVENTORY_AGE_INDICATOR_DAYS_MIN,
  INVENTORY_AGE_INDICATOR_NOT_FOUND_MESSAGE,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2002, isP2025 } from "../shared/prisma-errors.js"
import { InventoryAgeIndicatorExecutionError } from "./errors.js"
import type {
  InventoryAgeIndicatorUseCaseResult,
  UpdateInventoryAgeIndicatorUseCaseInput,
} from "./types.js"

export async function updateInventoryAgeIndicatorUseCase(
  id: string,
  input: UpdateInventoryAgeIndicatorUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<InventoryAgeIndicatorUseCaseResult> {
  assertActorEmail(actorEmail, "updateInventoryAgeIndicatorUseCase")

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (
      input.days !== undefined &&
      (!Number.isInteger(input.days) ||
        input.days < INVENTORY_AGE_INDICATOR_DAYS_MIN ||
        input.days > INVENTORY_AGE_INDICATOR_DAYS_MAX)
    ) {
      throw new InventoryAgeIndicatorExecutionError({
        code: "INVENTORY_AGE_INDICATOR_VALIDATION_FAILED",
        message: INVENTORY_AGE_INDICATOR_DAYS_INVALID_MESSAGE,
        status: 400,
        field: "days",
      })
    }

    try {
      return await updateInventoryAgeIndicatorRecord(id, { ...input, updatedBy: actorEmail }, c)
    } catch (error) {
      if (isP2002(error, "days")) {
        throw new InventoryAgeIndicatorExecutionError({
          code: "INVENTORY_AGE_INDICATOR_DAYS_CONFLICT",
          message: INVENTORY_AGE_INDICATOR_DAYS_CONFLICT_MESSAGE,
          status: 409,
          field: "days",
        })
      }
      if (isP2025(error)) {
        throw new InventoryAgeIndicatorExecutionError({
          code: "INVENTORY_AGE_INDICATOR_NOT_FOUND",
          message: INVENTORY_AGE_INDICATOR_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
