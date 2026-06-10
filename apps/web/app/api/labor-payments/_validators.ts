import { z } from "zod"
import { LaborPaymentExecutionError } from "@builders/application"
import type {
  CreateLaborPaymentUseCaseInput,
  LaborPaymentsListFilters,
  ListInput,
  UpdateLaborPaymentUseCaseInput,
} from "@builders/application"
import {
  isValidMoneyAmount,
  normalizeMoneyAmount,
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

// Money standard: normalize every accepted amount to a canonical two-decimal
// string (`@builders/domain`). Rejects negatives / >2 decimals; empty → "".
function optionalCost(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  let raw: string
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(`${field} must be a valid amount`, field)
    raw = String(value)
  } else if (typeof value === "string") {
    raw = value
  } else {
    fail(`${field} must be an amount`, field)
  }
  const trimmed = raw.trim()
  if (!trimmed) return ""
  if (!isValidMoneyAmount(trimmed)) {
    fail(`${field} must be a positive amount with up to 2 decimals`, field)
  }
  return normalizeMoneyAmount(trimmed)
}

export function validateCreateLaborPaymentInput(
  body: Record<string, unknown>,
): CreateLaborPaymentUseCaseInput {
  return {
    contactId: requireString(body.contactId, "contactId"),
    workOrderId: optionalString(body.workOrderId, "workOrderId"),
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
  if ("workOrderId" in body) input.workOrderId = optionalString(body.workOrderId, "workOrderId")
  if ("unit" in body) input.unit = optionalString(body.unit, "unit")
  if ("description" in body) input.description = optionalString(body.description, "description")
  if ("cost" in body) input.cost = optionalCost(body.cost, "cost")
  return input
}

// --- List query validator ---

const listLaborPaymentsQuerySchema = z.object({
  q: z.string().optional(),
  cost: z.string().optional(),
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

  // Money standard: only apply the cost filter when the typed value is a valid
  // amount; normalize to canonical `X.XX`. A half-typed value (e.g. "100.")
  // silently drops the filter rather than 400-ing the list.
  const trimmedCost = parsed.cost?.trim()
  const filters: LaborPaymentsListFilters =
    trimmedCost && isValidMoneyAmount(trimmedCost)
      ? { cost: [normalizeMoneyAmount(trimmedCost)] }
      : {}

  return {
    search,
    filters,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
