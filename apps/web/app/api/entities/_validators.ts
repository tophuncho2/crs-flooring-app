import { z } from "zod"
import { EntityExecutionError } from "@builders/application"
import type {
  CreateEntityUseCaseInput,
  ListInput,
  ListSort,
  EntitiesListFilters,
  UpdateEntityUseCaseInput,
} from "@builders/application"
import {
  LIST_ENTITIES_MAX_PAGE_SIZE,
  LIST_ENTITIES_PAGE_SIZE,
  normalizePhoneNumber,
} from "@builders/domain"
import { optionsQuerySchema, requireColor, requireString } from "@/app/api/_shared/validators"

function fail(message: string, field?: string): never {
  throw new EntityExecutionError({
    code: "ENTITY_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
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

// The entity's single linked type id. A non-empty string assigns; null/absent
// leaves it unassigned. Referential validity (the id points at a real type) is
// the data/application layer's job (FK → P2003 → 400).
function optionalTypeId(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") fail("typeId must be a string or null", "typeId")
  const trimmed = (value as string).trim()
  return trimmed.length > 0 ? trimmed : null
}

export function validateCreateEntityInput(
  body: Record<string, unknown>,
): CreateEntityUseCaseInput {
  return {
    entity: requireString(body.entity, "entity", fail),
    streetAddress: optionalString(body.streetAddress),
    city: optionalString(body.city),
    state: optionalState(body.state, "state"),
    postalCode: optionalString(pickPostalCode(body)),
    phone: optionalPhone(body.phone),
    email: optionalString(body.email),
    typeId: "typeId" in body ? optionalTypeId(body.typeId) : null,
  }
}

export function validateUpdateEntityInput(
  body: Record<string, unknown>,
): UpdateEntityUseCaseInput {
  const input: UpdateEntityUseCaseInput = {}

  if ("entity" in body) input.entity = requireString(body.entity, "entity", fail)
  if ("streetAddress" in body) input.streetAddress = optionalString(body.streetAddress)
  if ("city" in body) input.city = optionalString(body.city)
  if ("state" in body) input.state = optionalState(body.state, "state")
  if ("zip" in body || "postalCode" in body) input.postalCode = optionalString(pickPostalCode(body))
  if ("phone" in body) input.phone = optionalPhone(body.phone)
  if ("email" in body) input.email = optionalString(body.email)
  if ("typeId" in body) input.typeId = optionalTypeId(body.typeId)
  if ("color" in body) input.color = requireColor(body.color, "color", fail)

  return input
}

// --- List query validator ---

const listEntitiesQuerySchema = z.object({
  q: z.string().optional(),
  entityNumber: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_ENTITIES_MAX_PAGE_SIZE)
    .default(LIST_ENTITIES_PAGE_SIZE),
})

// UI-exposed sortable fields. Row# (ENT #) is intentionally excluded — createdAt
// is the canonical chronological key; Type(s) is a to-many relation and not
// orderable by name. Kept independent of the data-layer + client allowlists
// (defense-in-depth); the allowlist-sync test holds the three in step.
export const ENTITIES_UI_SORT_FIELDS = [
  "entity",
  "state",
  "createdAt",
  "updatedAt",
] as const
const ENTITIES_MAX_SORT_LEVELS = 3

/** Parse the ordered `sorts=field:dir,field:dir` param (validated, deduped, capped). */
function parseSortsParam(raw: string | null): ListSort[] {
  if (!raw) return []
  const allowed = new Set<string>(ENTITIES_UI_SORT_FIELDS)
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const token of raw.split(",")) {
    const [field, direction] = token.split(":")
    if (!field || seen.has(field) || !allowed.has(field)) continue
    seen.add(field)
    result.push({ field, direction: direction === "desc" ? "desc" : "asc" })
    if (result.length >= ENTITIES_MAX_SORT_LEVELS) break
  }
  return result
}

export function validateListEntitiesQuery(
  searchParams: URLSearchParams,
): ListInput<EntitiesListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key === "state" || key === "entityTypeIds") return
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

  const entityNumberTrimmed = parsed.entityNumber?.trim()
  const entityNumber = entityNumberTrimmed ? entityNumberTrimmed : undefined

  const stateRaw = searchParams.getAll("state")
  const state = Array.from(
    new Set(
      stateRaw
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => /^[A-Z]{2}$/.test(entry)),
    ),
  )

  const entityTypeIds = Array.from(
    new Set(
      searchParams
        .getAll("entityTypeIds")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  )

  const filters =
    entityNumber || state.length > 0 || entityTypeIds.length > 0
      ? {
          ...(entityNumber ? { entityNumber } : {}),
          ...(state.length > 0 ? { state } : {}),
          ...(entityTypeIds.length > 0 ? { entityTypeIds } : {}),
        }
      : undefined

  // Canonical ordered sort via `sorts`. With no sort param the list falls back to
  // the server's uniform base order (createdAt desc, id desc) — pass empty.
  const sorts = parseSortsParam(searchParams.get("sorts"))

  return {
    search,
    ...(sorts.length > 0 ? { sort: sorts[0], sorts } : {}),
    filters,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- Options query validator ---

const entityOptionsQuerySchema = optionsQuerySchema()

export type ValidatedEntityOptionsQuery = {
  search?: string
  typeIds?: string[]
  skip: number
  take: number
}

export function validateEntityOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedEntityOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key === "typeId") return
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
  const typeIds = Array.from(
    new Set(searchParams.getAll("typeId").map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  )
  return {
    search: trimmed ? trimmed : undefined,
    typeIds: typeIds.length > 0 ? typeIds : undefined,
    skip: parsed.skip,
    take: parsed.take,
  }
}
