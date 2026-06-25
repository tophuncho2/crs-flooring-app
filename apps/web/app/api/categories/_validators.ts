import { z } from "zod"
import type { CategoriesListFilters, ListInput } from "@builders/application"
import {
  LIST_CATEGORIES_MAX_PAGE_SIZE,
  LIST_CATEGORIES_PAGE_SIZE,
} from "@builders/domain"

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const categoryOptionsQuerySchema = z.object({
  search: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedCategoryOptionsQuery = {
  search?: string
  skip: number
  take: number
}

export class CategoryOptionsValidationError extends Error {
  readonly status = 400
  readonly field: string | undefined

  constructor(message: string, field?: string) {
    super(message)
    this.name = "CategoryOptionsValidationError"
    this.field = field
  }
}

export function validateCategoryOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedCategoryOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = categoryOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new CategoryOptionsValidationError(
      issue?.message ?? "Invalid category options query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmed = parsed.search?.trim()
  return {
    search: trimmed ? trimmed : undefined,
    skip: parsed.skip,
    take: parsed.take,
  }
}

// --- List view (pagination only) ---

export class CategoriesListValidationError extends Error {
  readonly status = 400
  readonly field: string | undefined

  constructor(message: string, field?: string) {
    super(message)
    this.name = "CategoriesListValidationError"
    this.field = field
  }
}

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
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listCategoriesQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new CategoriesListValidationError(
      issue?.message ?? "Invalid categories list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  return {
    filters: {},
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
