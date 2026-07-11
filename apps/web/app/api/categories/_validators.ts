import { z } from "zod"
import type { CategoriesListFilters, ListInput } from "@builders/application"
import {
  LIST_CATEGORIES_MAX_PAGE_SIZE,
  LIST_CATEGORIES_PAGE_SIZE,
} from "@builders/domain"
import {
  failValidation,
  optionsQuerySchema,
  parseQuery,
} from "@/app/api/_shared/validators"

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const categoryOptionsQuerySchema = optionsQuerySchema({
  takeMax: OPTIONS_MAX_TAKE,
  takeDefault: OPTIONS_DEFAULT_TAKE,
})

export type ValidatedCategoryOptionsQuery = {
  search?: string
  skip: number
  take: number
}

export function validateCategoryOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedCategoryOptionsQuery {
  const parsed = parseQuery(
    searchParams,
    categoryOptionsQuerySchema,
    failValidation,
    "Invalid category options query",
  )
  const trimmed = parsed.search?.trim()
  return {
    search: trimmed ? trimmed : undefined,
    skip: parsed.skip,
    take: parsed.take,
  }
}

// --- List view (pagination only) ---

// Read-only list — pagination only (no search/filter on this surface).
const listCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_CATEGORIES_MAX_PAGE_SIZE)
    .default(LIST_CATEGORIES_PAGE_SIZE),
})

export function validateListCategoriesQuery(
  searchParams: URLSearchParams,
): ListInput<CategoriesListFilters> {
  const parsed = parseQuery(
    searchParams,
    listCategoriesQuerySchema,
    failValidation,
    "Invalid categories list query",
  )
  return {
    filters: {},
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
