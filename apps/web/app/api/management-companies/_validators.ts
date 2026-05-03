import { z } from "zod"
import { ManagementCompanyExecutionError } from "@builders/application"
import type {
  CreateManagementCompanyUseCaseInput,
  ListInput,
  ManagementCompaniesListFilters,
  UpdateManagementCompanyUseCaseInput,
} from "@builders/application"
import {
  LIST_MANAGEMENT_COMPANIES_MAX_PAGE_SIZE,
  LIST_MANAGEMENT_COMPANIES_PAGE_SIZE,
} from "@builders/domain"

function fail(message: string, field?: string): never {
  throw new ManagementCompanyExecutionError({
    code: "MANAGEMENT_COMPANY_VALIDATION_FAILED",
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

export function validateCreateManagementCompanyInput(
  body: Record<string, unknown>,
): CreateManagementCompanyUseCaseInput {
  return {
    name: requireString(body.name, "name"),
    streetAddress: optionalString(body.streetAddress),
    city: optionalString(body.city),
    state: optionalState(body.state, "state"),
    postalCode: optionalString(pickPostalCode(body)),
    phone: optionalString(body.phone),
    email: optionalString(body.email),
  }
}

export function validateUpdateManagementCompanyInput(
  body: Record<string, unknown>,
): UpdateManagementCompanyUseCaseInput {
  const input: UpdateManagementCompanyUseCaseInput = {}

  if ("name" in body) input.name = requireString(body.name, "name")
  if ("streetAddress" in body) input.streetAddress = optionalString(body.streetAddress)
  if ("city" in body) input.city = optionalString(body.city)
  if ("state" in body) input.state = optionalState(body.state, "state")
  if ("zip" in body || "postalCode" in body) input.postalCode = optionalString(pickPostalCode(body))
  if ("phone" in body) input.phone = optionalString(body.phone)
  if ("email" in body) input.email = optionalString(body.email)

  return input
}

// --- List query validator ---

const listManagementCompaniesQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_MANAGEMENT_COMPANIES_MAX_PAGE_SIZE)
    .default(LIST_MANAGEMENT_COMPANIES_PAGE_SIZE),
})

export function validateListManagementCompaniesQuery(
  searchParams: URLSearchParams,
): ListInput<ManagementCompaniesListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listManagementCompaniesQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid management companies list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined

  return {
    search,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- Options query validator ---

const managementCompanyOptionsQuerySchema = z.object({
  search: z.string().optional(),
  take: z.coerce.number().int().min(1).max(50).default(20),
})

export type ValidatedManagementCompanyOptionsQuery = {
  search?: string
  take: number
}

export function validateManagementCompanyOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedManagementCompanyOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = managementCompanyOptionsQuerySchema.safeParse(raw)
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
    take: parsed.take,
  }
}
