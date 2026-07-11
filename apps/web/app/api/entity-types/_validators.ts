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
} from "@builders/domain"
import {
  optionsQuerySchema,
  parseQuery,
  requireColor,
  requireString,
} from "@/app/api/_shared/validators"

function fail(message: string, field?: string): never {
  throw new EntityTypeExecutionError({
    code: "ENTITY_TYPE_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

export function validateCreateEntityTypeInput(
  body: Record<string, unknown>,
): CreateEntityTypeUseCaseInput {
  return {
    type: requireString(body.type, "type", fail),
    color: requireColor(body.color, "color", fail),
  }
}

export function validateUpdateEntityTypeInput(
  body: Record<string, unknown>,
): UpdateEntityTypeUseCaseInput {
  const input: UpdateEntityTypeUseCaseInput = {}
  if ("type" in body) input.type = requireString(body.type, "type", fail)
  if ("color" in body) input.color = requireColor(body.color, "color", fail)
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
  const parsed = parseQuery(searchParams, listEntityTypesQuerySchema, fail, "Invalid entity types list query")

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

const entityTypeOptionsQuerySchema = optionsQuerySchema()

export type ValidatedEntityTypeOptionsQuery = {
  search?: string
  skip: number
  take: number
}

export function validateEntityTypeOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedEntityTypeOptionsQuery {
  const parsed = parseQuery(searchParams, entityTypeOptionsQuerySchema, fail, "Invalid options query")
  const trimmed = parsed.search?.trim()
  return {
    search: trimmed ? trimmed : undefined,
    skip: parsed.skip,
    take: parsed.take,
  }
}
