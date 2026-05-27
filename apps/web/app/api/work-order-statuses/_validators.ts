import { z } from "zod"

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const workOrderStatusOptionsQuerySchema = z.object({
  search: z.string().optional(),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedWorkOrderStatusOptionsQuery = {
  search?: string
  take: number
}

export class WorkOrderStatusOptionsValidationError extends Error {
  readonly status = 400
  readonly field: string | undefined

  constructor(message: string, field?: string) {
    super(message)
    this.name = "WorkOrderStatusOptionsValidationError"
    this.field = field
  }
}

export function validateWorkOrderStatusOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedWorkOrderStatusOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = workOrderStatusOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new WorkOrderStatusOptionsValidationError(
      issue?.message ?? "Invalid work order status options query",
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
