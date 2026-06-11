import { z } from "zod"
import { WorkOrderExecutionError } from "@builders/application"

const PAGE_DEFAULT_TAKE = 15
const PAGE_MAX_TAKE = 50

const workOrdersPageQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(PAGE_MAX_TAKE).default(PAGE_DEFAULT_TAKE),
})

export type ValidatedWorkOrdersPageQuery = {
  skip: number
  take: number
}

export function validateWorkOrdersPageQuery(
  searchParams: URLSearchParams,
): ValidatedWorkOrdersPageQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = workOrdersPageQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new WorkOrderExecutionError({
      code: "WORK_ORDER_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid work orders page query",
      status: 400,
      field: issue?.path[0] ? String(issue.path[0]) : undefined,
    })
  }

  return parseResult.data
}
