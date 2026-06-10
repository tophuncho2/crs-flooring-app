import { z } from "zod"
import { LaborPaymentExecutionError } from "@builders/application"
import type {
  CreateLaborPaymentUseCaseInput,
  LaborPaymentsListFilters,
  ListInput,
  UpdateLaborPaymentUseCaseInput,
} from "@builders/application"
import {
  LIST_LABOR_PAYMENTS_MAX_PAGE_SIZE,
  LIST_LABOR_PAYMENTS_PAGE_SIZE,
} from "@builders/domain"

function fail(message: string, field?: string): never {
  throw new LaborPaymentExecutionError({
    code: "LABOR_PAYMENT_VALIDATION_FAILED",
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

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string") fail(`${field} must be a string`, field)
  return (value as string).trim()
}

function optionalCost(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(`${field} must be a valid amount`, field)
    return String(value)
  }
  if (typeof value !== "string") fail(`${field} must be an amount`, field)
  const trimmed = (value as string).trim()
  if (!trimmed) return ""
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    fail(`${field} must be a positive amount with up to 2 decimals`, field)
  }
  return trimmed
}

export function validateCreateLaborPaymentInput(
  body: Record<string, unknown>,
): CreateLaborPaymentUseCaseInput {
  return {
    contactId: requireString(body.contactId, "contactId"),
    unit: optionalString(body.unit, "unit"),
    description: optionalString(body.description, "description"),
    cost: optionalCost(body.cost, "cost"),
  }
}

export function validateUpdateLaborPaymentInput(
  body: Record<string, unknown>,
): UpdateLaborPaymentUseCaseInput {
  const input: UpdateLaborPaymentUseCaseInput = {}
  if ("contactId" in body) input.contactId = requireString(body.contactId, "contactId")
  if ("unit" in body) input.unit = optionalString(body.unit, "unit")
  if ("description" in body) input.description = optionalString(body.description, "description")
  if ("cost" in body) input.cost = optionalCost(body.cost, "cost")
  return input
}

// --- List query validator ---

const listLaborPaymentsQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_LABOR_PAYMENTS_MAX_PAGE_SIZE)
    .default(LIST_LABOR_PAYMENTS_PAGE_SIZE),
})

export function validateListLaborPaymentsQuery(
  searchParams: URLSearchParams,
): ListInput<LaborPaymentsListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listLaborPaymentsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid labor payments list query",
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
