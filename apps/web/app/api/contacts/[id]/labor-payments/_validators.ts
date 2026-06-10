import { z } from "zod"
import { LaborPaymentExecutionError } from "@builders/application"

const PAGE_DEFAULT_TAKE = 15
const PAGE_MAX_TAKE = 50

const laborPaymentsPageQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(PAGE_MAX_TAKE).default(PAGE_DEFAULT_TAKE),
})

export type ValidatedLaborPaymentsPageQuery = {
  skip: number
  take: number
}

export function validateLaborPaymentsPageQuery(
  searchParams: URLSearchParams,
): ValidatedLaborPaymentsPageQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = laborPaymentsPageQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new LaborPaymentExecutionError({
      code: "LABOR_PAYMENT_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid labor payments page query",
      status: 400,
      field: issue?.path[0] ? String(issue.path[0]) : undefined,
    })
  }

  return parseResult.data
}
