import { z } from "zod"
import { EntityExecutionError } from "@builders/application"
import type {
  CreateEntityUseCaseInput,
  ListInput,
  EntitiesListFilters,
  UpdateEntityUseCaseInput,
} from "@builders/application"
import {
  LIST_ENTITIES_MAX_PAGE_SIZE,
  LIST_ENTITIES_PAGE_SIZE,
  normalizePhoneNumber,
} from "@builders/domain"

function fail(message: string, field?: string): never {
  throw new EntityExecutionError({
    code: "ENTITY_VALIDATION_FAILED",
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

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

// Phone standard (lenient): normalize to canonical digits, never reject. Bad
// shapes (extensions, international, partial) are kept as digits, not 400'd.
function optionalPhone(value: unknown): string | null {
  const trimmed = optionalString(value)
  return trimmed === null ? null : normalizePhoneNumber(trimmed) || null
}

function optionalState(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^[A-Za-z]{2}$/.test(trimmed)) fail(`${field} must be a 2-letter state code`, field)
  return trimmed.toUpperCase()
}

function pickPostalCode(body: Record<string, unknown>): unknown {
  if ("postalCode" in body) return body.postalCode
  if ("zip" in body) return body.zip
  return undefined
}

// Linked entity-type ids. Must be an array of non-empty strings; dedup'd to keep
// set semantics. Referential validity (the ids point at real types) is the
// data/application layer's job (FK → P2003 → 400).
function requireTypeIds(value: unknown): string[] {
  if (!Array.isArray(value)) fail("typeIds must be an array", "typeIds")
  const ids = value.map((entry) => {
    if (typeof entry !== "string" || !entry.trim()) {
      fail("typeIds must be non-empty strings", "typeIds")
    }
    return (entry as string).trim()
  })
  return Array.from(new Set(ids))
}

export function validateCreateEntityInput(
  body: Record<string, unknown>,
): CreateEntityUseCaseInput {
  return {
    entity: requireString(body.entity, "entity"),
    streetAddress: optionalString(body.streetAddress),
    city: optionalString(body.city),
    state: optionalState(body.state, "state"),
    postalCode: optionalString(pickPostalCode(body)),
    phone: optionalPhone(body.phone),
    email: optionalString(body.email),
    typeIds: "typeIds" in body ? requireTypeIds(body.typeIds) : [],
  }
}

export function validateUpdateEntityInput(
  body: Record<string, unknown>,
): UpdateEntityUseCaseInput {
  const input: UpdateEntityUseCaseInput = {}

  if ("entity" in body) input.entity = requireString(body.entity, "entity")
  if ("streetAddress" in body) input.streetAddress = optionalString(body.streetAddress)
  if ("city" in body) input.city = optionalString(body.city)
  if ("state" in body) input.state = optionalState(body.state, "state")
  if ("zip" in body || "postalCode" in body) input.postalCode = optionalString(pickPostalCode(body))
  if ("phone" in body) input.phone = optionalPhone(body.phone)
  if ("email" in body) input.email = optionalString(body.email)
  if ("typeIds" in body) input.typeIds = requireTypeIds(body.typeIds)

  return input
}

// --- List query validator ---

const listEntitiesQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_ENTITIES_MAX_PAGE_SIZE)
    .default(LIST_ENTITIES_PAGE_SIZE),
})

export function validateListEntitiesQuery(
  searchParams: URLSearchParams,
): ListInput<EntitiesListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key === "state") return
    raw[key] = value
  })

  const parseResult = listEntitiesQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid entities list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined

  const stateRaw = searchParams.getAll("state")
  const state = Array.from(
    new Set(
      stateRaw
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => /^[A-Z]{2}$/.test(entry)),
    ),
  )

  const filters = state.length > 0 ? { state } : undefined

  return {
    search,
    filters,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- Options query validator ---

const entityOptionsQuerySchema = z.object({
  search: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(50).default(20),
})

export type ValidatedEntityOptionsQuery = {
  search?: string
  skip: number
  take: number
}

export function validateEntityOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedEntityOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = entityOptionsQuerySchema.safeParse(raw)
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
