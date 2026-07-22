import { z } from "zod"
import { InventoryAgeIndicatorExecutionError } from "@builders/application"
import type {
  CreateInventoryAgeIndicatorUseCaseInput,
  InventoryAgeIndicatorsListFilters,
  ListInput,
  UpdateInventoryAgeIndicatorUseCaseInput,
} from "@builders/application"
import {
  INVENTORY_AGE_INDICATOR_DAYS_MAX,
  INVENTORY_AGE_INDICATOR_DAYS_MIN,
  LIST_INVENTORY_AGE_INDICATORS_MAX_PAGE_SIZE,
  LIST_INVENTORY_AGE_INDICATORS_PAGE_SIZE,
} from "@builders/domain"
import { parseQuery, requireColor, requireInt } from "@/app/api/_shared/validators"

function fail(message: string, field?: string): never {
  throw new InventoryAgeIndicatorExecutionError({
    code: "INVENTORY_AGE_INDICATOR_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

const DAYS_BOUNDS = {
  min: INVENTORY_AGE_INDICATOR_DAYS_MIN,
  max: INVENTORY_AGE_INDICATOR_DAYS_MAX,
}

export function validateCreateInventoryAgeIndicatorInput(
  body: Record<string, unknown>,
): CreateInventoryAgeIndicatorUseCaseInput {
  return {
    days: requireInt(body.days, "days", fail, DAYS_BOUNDS),
    color: requireColor(body.color, "color", fail),
  }
}

export function validateUpdateInventoryAgeIndicatorInput(
  body: Record<string, unknown>,
): UpdateInventoryAgeIndicatorUseCaseInput {
  const input: UpdateInventoryAgeIndicatorUseCaseInput = {}
  if ("days" in body) input.days = requireInt(body.days, "days", fail, DAYS_BOUNDS)
  if ("color" in body) input.color = requireColor(body.color, "color", fail)
  return input
}

// --- List query validator (no filters/search — just pagination) ---

const listInventoryAgeIndicatorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_INVENTORY_AGE_INDICATORS_MAX_PAGE_SIZE)
    .default(LIST_INVENTORY_AGE_INDICATORS_PAGE_SIZE),
})

export function validateListInventoryAgeIndicatorsQuery(
  searchParams: URLSearchParams,
): ListInput<InventoryAgeIndicatorsListFilters> {
  const parsed = parseQuery(
    searchParams,
    listInventoryAgeIndicatorsQuerySchema,
    fail,
    "Invalid inventory age indicators list query",
  )

  return {
    filters: {},
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
