import { z } from "zod"
import type { ListInput, UnitOfMeasuresListFilters } from "@builders/application"
import {
  LIST_UNIT_OF_MEASURES_MAX_PAGE_SIZE,
  LIST_UNIT_OF_MEASURES_PAGE_SIZE,
} from "@builders/domain"

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const unitOfMeasureOptionsQuerySchema = z.object({
  search: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedUnitOfMeasureOptionsQuery = {
  search?: string
  skip: number
  take: number
}

export class UnitOfMeasureOptionsValidationError extends Error {
  readonly status = 400
  readonly field: string | undefined

  constructor(message: string, field?: string) {
    super(message)
    this.name = "UnitOfMeasureOptionsValidationError"
    this.field = field
  }
}

export function validateUnitOfMeasureOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedUnitOfMeasureOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = unitOfMeasureOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new UnitOfMeasureOptionsValidationError(
      issue?.message ?? "Invalid unit of measure options query",
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

export class UnitOfMeasuresListValidationError extends Error {
  readonly status = 400
  readonly field: string | undefined

  constructor(message: string, field?: string) {
    super(message)
    this.name = "UnitOfMeasuresListValidationError"
    this.field = field
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
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listUnitOfMeasuresQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new UnitOfMeasuresListValidationError(
      issue?.message ?? "Invalid unit of measures list query",
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
