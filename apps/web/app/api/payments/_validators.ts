import { z } from "zod"
import { PaymentExecutionError } from "@builders/application"
import type {
  CreatePaymentUseCaseInput,
  ListInput,
  PaymentsListFilters,
  UpdatePaymentUseCaseInput,
} from "@builders/application"
import {
  isValidMoneyAmount,
  normalizeMoneyAmount,
  LIST_PAYMENTS_MAX_PAGE_SIZE,
  LIST_PAYMENTS_PAGE_SIZE,
  type FlooringPaymentDirection,
} from "@builders/domain"

function fail(message: string, field?: string): never {
  throw new PaymentExecutionError({
    code: "PAYMENT_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string") fail(`${field} must be a string`, field)
  return (value as string).trim()
}

// Nullable link id: `undefined` = omitted (leave as-is on update), `null`/"" =
// explicit clear (unlink), a non-empty string = set the link. Preserves the
// distinction `optionalString` collapses, so a cleared picker actually unlinks.
function optionalLinkId(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== "string") fail(`${field} must be a string`, field)
  const trimmed = (value as string).trim()
  return trimmed.length > 0 ? trimmed : null
}

function requireDirection(value: unknown, field: string): FlooringPaymentDirection {
  if (value === "REVENUE" || value === "EXPENSE") return value
  fail(`${field} must be REVENUE or EXPENSE`, field)
}

function optionalDirection(value: unknown, field: string): FlooringPaymentDirection | undefined {
  if (value === undefined || value === null) return undefined
  return requireDirection(value, field)
}

// Money standard: amount is required, unsigned, positive, up to 2 decimals.
// Normalized to canonical `X.XX` (`@builders/domain`).
function requireAmount(value: unknown, field: string): string {
  let raw: string
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(`${field} must be a valid amount`, field)
    raw = String(value)
  } else if (typeof value === "string") {
    raw = value
  } else {
    fail(`${field} is required`, field)
  }
  const trimmed = raw.trim()
  if (!trimmed) fail(`${field} is required`, field)
  if (!isValidMoneyAmount(trimmed)) {
    fail(`${field} must be a positive amount with up to 2 decimals`, field)
  }
  if (Number(trimmed) <= 0) fail(`${field} must be greater than zero`, field)
  return normalizeMoneyAmount(trimmed)
}

function optionalAmount(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  return requireAmount(value, field)
}

export function validateCreatePaymentInput(
  body: Record<string, unknown>,
): CreatePaymentUseCaseInput {
  return {
    amount: requireAmount(body.amount, "amount"),
    direction: requireDirection(body.direction, "direction"),
    paymentDate: optionalString(body.paymentDate, "paymentDate"),
    entityId: optionalLinkId(body.entityId, "entityId"),
    workOrderId: optionalLinkId(body.workOrderId, "workOrderId"),
  }
}

export function validateUpdatePaymentInput(
  body: Record<string, unknown>,
): UpdatePaymentUseCaseInput {
  const input: UpdatePaymentUseCaseInput = {}
  if ("amount" in body) input.amount = optionalAmount(body.amount, "amount")
  if ("direction" in body) input.direction = optionalDirection(body.direction, "direction")
  if ("paymentDate" in body) input.paymentDate = optionalString(body.paymentDate, "paymentDate")
  if ("entityId" in body) input.entityId = optionalLinkId(body.entityId, "entityId")
  if ("workOrderId" in body) input.workOrderId = optionalLinkId(body.workOrderId, "workOrderId")
  return input
}

// --- List query validator (exact payment-number search + page/pageSize) ---

const listPaymentsQuerySchema = z.object({
  paymentNumber: z.string().optional(),
  amount: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_PAYMENTS_MAX_PAGE_SIZE)
    .default(LIST_PAYMENTS_PAGE_SIZE),
})

export function validateListPaymentsQuery(
  searchParams: URLSearchParams,
): ListInput<PaymentsListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listPaymentsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid payments list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const paymentNumber = parsed.paymentNumber?.trim()
  const amount = parsed.amount?.trim()
  const filters: PaymentsListFilters = {}
  if (paymentNumber) filters.paymentNumber = paymentNumber
  if (amount) filters.amount = amount
  return {
    filters,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
