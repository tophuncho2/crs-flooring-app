import { z } from "zod"
import { PropertyExecutionError } from "@builders/application"
import type {
  CreatePropertyUseCaseInput,
  ListInput,
  PropertiesListFilters,
  UpdatePropertyUseCaseInput,
} from "@builders/application"
import {
  LIST_PROPERTIES_MAX_PAGE_SIZE,
  LIST_PROPERTIES_PAGE_SIZE,
  PALETTE_COLOR_INVALID_MESSAGE,
  isPaletteColor,
  normalizePhoneNumber,
  type PaletteColor,
} from "@builders/domain"

function fail(message: string, field?: string): never {
  throw new PropertyExecutionError({
    code: "PROPERTY_VALIDATION_FAILED",
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

// Palette tag is strict-when-present on update: a supplied value must be a real
// PaletteColor, else 400 with the shared message. Edit-only — create never
// accepts color (new rows fall to the DB default SLATE).
function requireColor(value: unknown): PaletteColor {
  if (!isPaletteColor(value)) fail(PALETTE_COLOR_INVALID_MESSAGE, "color")
  return value
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
    name: requireString(body.name, "name"),
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
  if ("name" in body) input.name = requireString(body.name, "name")
  if ("streetAddress" in body) input.streetAddress = optionalString(body.streetAddress)
  if ("city" in body) input.city = optionalString(body.city)
  if ("state" in body) input.state = optionalState(body.state, "state")
  if ("zip" in body || "postalCode" in body) input.postalCode = optionalString(pickPostalCode(body))
  if ("phone" in body) input.phone = optionalPhone(body.phone)
  if ("email" in body) input.email = optionalString(body.email)
  if ("instructions" in body) input.instructions = optionalString(body.instructions)
  if ("color" in body) input.color = requireColor(body.color)

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

  return {
    search,
    filters,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- Options query validator ---

const propertyOptionsQuerySchema = z.object({
  search: z.string().optional(),
  entityId: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(50).default(20),
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
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = propertyOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid property options query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.search?.trim()
  const trimmedEntityId = parsed.entityId?.trim()
  return {
    search: trimmedSearch ? trimmedSearch : undefined,
    entityId: trimmedEntityId ? trimmedEntityId : undefined,
    skip: parsed.skip,
    take: parsed.take,
  }
}
