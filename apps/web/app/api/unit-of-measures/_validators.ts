import { z } from "zod"
import type { ListInput, UnitOfMeasuresListFilters } from "@builders/application"
import {
  LIST_UNIT_OF_MEASURES_MAX_PAGE_SIZE,
  LIST_UNIT_OF_MEASURES_PAGE_SIZE,
} from "@builders/domain"
import {
  failValidation,
  optionsQuerySchema,
  parseQuery,
} from "@/app/api/_shared/validators"

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const unitOfMeasureOptionsQuerySchema = optionsQuerySchema({
  takeMax: OPTIONS_MAX_TAKE,
  takeDefault: OPTIONS_DEFAULT_TAKE,
})

export type ValidatedUnitOfMeasureOptionsQuery = {
  search?: string
  skip: number
  take: number
}

export function validateUnitOfMeasureOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedUnitOfMeasureOptionsQuery {
  const parsed = parseQuery(
    searchParams,
    unitOfMeasureOptionsQuerySchema,
    failValidation,
    "Invalid unit of measure options query",
  )
  const trimmed = parsed.search?.trim()
  return {
    search: trimmed ? trimmed : undefined,
    skip: parsed.skip,
    take: parsed.take,
  }
}

// Read-only list — pagination only (no search/filter on this surface).
const listUnitOfMeasuresQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_UNIT_OF_MEASURES_MAX_PAGE_SIZE)
    .default(LIST_UNIT_OF_MEASURES_PAGE_SIZE),
})

export function validateListUnitOfMeasuresQuery(
  searchParams: URLSearchParams,
): ListInput<UnitOfMeasuresListFilters> {
  const parsed = parseQuery(
    searchParams,
    listUnitOfMeasuresQuerySchema,
    failValidation,
    "Invalid unit of measures list query",
  )
  return {
    filters: {},
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
