import { z } from "zod"
import { PropertyExecutionError } from "@builders/application"
import type {
  CreatePropertyUseCaseInput,
  ListInput,
  ListSort,
  PropertiesListFilters,
  UpdatePropertyUseCaseInput,
} from "@builders/application"
import {
  LIST_PROPERTIES_MAX_PAGE_SIZE,
  LIST_PROPERTIES_PAGE_SIZE,
  normalizePhoneNumber,
} from "@builders/domain"
import { optionsQuerySchema, parseQuery, requireColor, requireString } from "@/app/api/_shared/validators"

function fail(message: string, field?: string): never {
  throw new PropertyExecutionError({
    code: "PROPERTY_VALIDATION_FAILED",
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

export function validateCreatePropertyInput(
  body: Record<string, unknown>,
): CreatePropertyUseCaseInput {
  return {
    entityId: optionalString(body.entityId),
    name: requireString(body.name, "name", fail),
    streetAddress: optionalString(body.streetAddress),
    city: optionalString(body.city),
    state: optionalState(body.state, "state"),
    postalCode: optionalString(pickPostalCode(body)),
    phone: optionalPhone(body.phone),
    email: optionalString(body.email),
    instructions: optionalString(body.instructions),
  }
}

export function validateUpdatePropertyInput(
  body: Record<string, unknown>,
): UpdatePropertyUseCaseInput {
  const input: UpdatePropertyUseCaseInput = {}

  if ("entityId" in body) input.entityId = optionalString(body.entityId)
  if ("name" in body) input.name = requireString(body.name, "name", fail)
  if ("streetAddress" in body) input.streetAddress = optionalString(body.streetAddress)
  if ("city" in body) input.city = optionalString(body.city)
  if ("state" in body) input.state = optionalState(body.state, "state")
  if ("zip" in body || "postalCode" in body) input.postalCode = optionalString(pickPostalCode(body))
  if ("phone" in body) input.phone = optionalPhone(body.phone)
  if ("email" in body) input.email = optionalString(body.email)
  if ("instructions" in body) input.instructions = optionalString(body.instructions)
  if ("color" in body) input.color = requireColor(body.color, "color", fail)

  return input
}

// --- List query validator ---

const listPropertiesQuerySchema = z.object({
  q: z.string().optional(),
  propNumber: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_PROPERTIES_MAX_PAGE_SIZE)
    .default(LIST_PROPERTIES_PAGE_SIZE),
})

// UI-exposed sortable fields. Row# (PROP #) is intentionally excluded — createdAt
// is the canonical chronological key. Kept independent of the data-layer + client
// allowlists (defense-in-depth); the allowlist-sync test holds the three in step.
export const PROPERTIES_UI_SORT_FIELDS = [
  "name",
  "entity",
  "createdAt",
  "updatedAt",
] as const
const PROPERTIES_MAX_SORT_LEVELS = 3

/** Parse the ordered `sorts=field:dir,field:dir` param (validated, deduped, capped). */
function parseSortsParam(raw: string | null): ListSort[] {
  if (!raw) return []
  const allowed = new Set<string>(PROPERTIES_UI_SORT_FIELDS)
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const token of raw.split(",")) {
    const [field, direction] = token.split(":")
    if (!field || seen.has(field) || !allowed.has(field)) continue
    seen.add(field)
    result.push({ field, direction: direction === "desc" ? "desc" : "asc" })
    if (result.length >= PROPERTIES_MAX_SORT_LEVELS) break
  }
  return result
}

export function validateListPropertiesQuery(
  searchParams: URLSearchParams,
): ListInput<PropertiesListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key === "entityId" || key === "state") return
    raw[key] = value
  })

  const parseResult = listPropertiesQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(issue?.message ?? "Invalid properties list query", issue?.path[0] ? String(issue.path[0]) : undefined)
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined

  const trimmedPropNumber = parsed.propNumber?.trim()
  const propNumber = trimmedPropNumber ? trimmedPropNumber : undefined

  const entityIdRaw = searchParams.getAll("entityId")
  const entityId = Array.from(
    new Set(
      entityIdRaw
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  )

  const stateRaw = searchParams.getAll("state")
  const state = Array.from(
    new Set(
      stateRaw
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => /^[A-Z]{2}$/.test(entry)),
    ),
  )

  const filters =
    propNumber || entityId.length > 0 || state.length > 0
      ? {
          ...(propNumber ? { propNumber } : {}),
          ...(entityId.length > 0 ? { entityId } : {}),
          ...(state.length > 0 ? { state } : {}),
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

const propertyOptionsQuerySchema = optionsQuerySchema().extend({
  entityId: z.string().optional(),
})

export type ValidatedPropertyOptionsQuery = {
  search?: string
  entityId?: string
  skip: number
  take: number
}

export function validatePropertyOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedPropertyOptionsQuery {
  const parsed = parseQuery(searchParams, propertyOptionsQuerySchema, fail, "Invalid property options query")
  const trimmedSearch = parsed.search?.trim()
  const trimmedEntityId = parsed.entityId?.trim()
  return {
    search: trimmedSearch ? trimmedSearch : undefined,
    entityId: trimmedEntityId ? trimmedEntityId : undefined,
    skip: parsed.skip,
    take: parsed.take,
  }
}
