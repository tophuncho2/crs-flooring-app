import { z } from "zod"
import { PaymentPurposeExecutionError } from "@builders/application"
import type {
  CreatePaymentPurposeUseCaseInput,
  PaymentPurposesListFilters,
  ListInput,
  UpdatePaymentPurposeUseCaseInput,
} from "@builders/application"
import {
  LIST_PAYMENT_PURPOSES_MAX_PAGE_SIZE,
  LIST_PAYMENT_PURPOSES_PAGE_SIZE,
  PALETTE_COLOR_INVALID_MESSAGE,
  isPaletteColor,
  type PaletteColor,
} from "@builders/domain"

function fail(message: string, field?: string): never {
  throw new PaymentPurposeExecutionError({
    code: "PAYMENT_PURPOSE_VALIDATION_FAILED",
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

function requireColor(value: unknown): PaletteColor {
  if (!isPaletteColor(value)) fail(PALETTE_COLOR_INVALID_MESSAGE, "color")
  return value
}

export function validateCreatePaymentPurposeInput(
  body: Record<string, unknown>,
): CreatePaymentPurposeUseCaseInput {
  return {
    name: requireString(body.name, "name"),
    color: requireColor(body.color),
  }
}

export function validateUpdatePaymentPurposeInput(
  body: Record<string, unknown>,
): UpdatePaymentPurposeUseCaseInput {
  const input: UpdatePaymentPurposeUseCaseInput = {}
  if ("name" in body) input.name = requireString(body.name, "name")
  if ("color" in body) input.color = requireColor(body.color)
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
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = listPaymentPurposesQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid payment purposes list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
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
