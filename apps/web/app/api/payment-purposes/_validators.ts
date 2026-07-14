import { z } from "zod"
import { PaymentPurposeExecutionError } from "@builders/application"
import type {
  CreatePaymentPurposeUseCaseInput,
  PaymentPurposesListFilters,
  ListInput,
  SearchPaymentPurposeOptionsInput,
  UpdatePaymentPurposeUseCaseInput,
} from "@builders/application"
import {
  LIST_PAYMENT_PURPOSES_MAX_PAGE_SIZE,
  LIST_PAYMENT_PURPOSES_PAGE_SIZE,
} from "@builders/domain"
import { parseQuery, requireColor, requireString } from "@/app/api/_shared/validators"

function fail(message: string, field?: string): never {
  throw new PaymentPurposeExecutionError({
    code: "PAYMENT_PURPOSE_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

export function validateCreatePaymentPurposeInput(
  body: Record<string, unknown>,
): CreatePaymentPurposeUseCaseInput {
  return {
    name: requireString(body.name, "name", fail),
    color: requireColor(body.color, "color", fail),
  }
}

export function validateUpdatePaymentPurposeInput(
  body: Record<string, unknown>,
): UpdatePaymentPurposeUseCaseInput {
  const input: UpdatePaymentPurposeUseCaseInput = {}
  if ("name" in body) input.name = requireString(body.name, "name", fail)
  if ("color" in body) input.color = requireColor(body.color, "color", fail)
  return input
}

// --- List query validator ---

const listPaymentPurposesQuerySchema = z.object({
  q: z.string().optional(),
  paymentPurposeNumber: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_PAYMENT_PURPOSES_MAX_PAGE_SIZE)
    .default(LIST_PAYMENT_PURPOSES_PAGE_SIZE),
})

export function validateListPaymentPurposesQuery(
  searchParams: URLSearchParams,
): ListInput<PaymentPurposesListFilters> {
  const parsed = parseQuery(searchParams, listPaymentPurposesQuerySchema, fail, "Invalid payment purposes list query")
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined
  const trimmedPaymentPurposeNumber = parsed.paymentPurposeNumber?.trim()
  const paymentPurposeNumber = trimmedPaymentPurposeNumber ? trimmedPaymentPurposeNumber : undefined

  return {
    search,
    filters: { paymentPurposeNumber },
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- Options query validator (powers the payment-purpose picker) ---

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const paymentPurposeOptionsQuerySchema = z.object({
  search: z.string().optional(),
  take: z.coerce.number().int().min(1).max(OPTIONS_MAX_TAKE).default(OPTIONS_DEFAULT_TAKE),
})

export function validatePaymentPurposeOptionsQuery(
  searchParams: URLSearchParams,
): SearchPaymentPurposeOptionsInput {
  const parsed = parseQuery(
    searchParams,
    paymentPurposeOptionsQuerySchema,
    fail,
    "Invalid payment purpose options query",
  )
  const trimmed = parsed.search?.trim()
  return {
    search: trimmed ? trimmed : undefined,
    take: parsed.take,
  }
}
