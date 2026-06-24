import { z } from "zod"
import { EntityTypeExecutionError } from "@builders/application"
import type {
  CreateEntityTypeUseCaseInput,
  EntityTypesListFilters,
  ListInput,
  UpdateEntityTypeUseCaseInput,
} from "@builders/application"
import {
  LIST_ENTITY_TYPES_MAX_PAGE_SIZE,
  LIST_ENTITY_TYPES_PAGE_SIZE,
  PALETTE_COLOR_INVALID_MESSAGE,
  isPaletteColor,
  type PaletteColor,
} from "@builders/domain"

function fail(message: string, field?: string): never {
  throw new EntityTypeExecutionError({
    code: "ENTITY_TYPE_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") fail(`${field} is required`, field)
  const trimmed = (value as string).trim()
  if (!trimmed) fail(`${field} is required`, field)
  return trimmed
}

function requireColor(value: unknown): PaletteColor {
  if (!isPaletteColor(value)) fail(PALETTE_COLOR_INVALID_MESSAGE, "color")
  return value
}

export function validateCreateEntityTypeInput(
  body: Record<string, unknown>,
): CreateEntityTypeUseCaseInput {
  return {
    type: requireString(body.type, "type"),
    color: requireColor(body.color),
  }
}

export function validateUpdateEntityTypeInput(
  body: Record<string, unknown>,
): UpdateEntityTypeUseCaseInput {
  const input: UpdateEntityTypeUseCaseInput = {}
  if ("type" in body) input.type = requireString(body.type, "type")
  if ("color" in body) input.color = requireColor(body.color)
  return input
}

// --- List query validator ---

const listEntityTypesQuerySchema = z.object({
  q: z.string().optional(),
  entityTypeNumber: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_ENTITY_TYPES_MAX_PAGE_SIZE)
    .default(LIST_ENTITY_TYPES_PAGE_SIZE),
})

export function validateListEntityTypesQuery(
  searchParams: URLSearchParams,
): ListInput<EntityTypesListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listEntityTypesQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid entity types list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined
  const trimmedEntityTypeNumber = parsed.entityTypeNumber?.trim()
  const entityTypeNumber = trimmedEntityTypeNumber ? trimmedEntityTypeNumber : undefined

  return {
    search,
    filters: { entityTypeNumber },
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- Options query validator (powers the entity-type array picker) ---

const entityTypeOptionsQuerySchema = z.object({
  search: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(50).default(20),
})

export type ValidatedEntityTypeOptionsQuery = {
  search?: string
  skip: number
  take: number
}

export function validateEntityTypeOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedEntityTypeOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = entityTypeOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid options query",
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
