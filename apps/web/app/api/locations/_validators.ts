import { z } from "zod"

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const locationOptionsQuerySchema = z.object({
  warehouseId: z.string().min(1, "warehouseId is required"),
  search: z.string().optional(),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedLocationOptionsQuery = {
  warehouseId: string
  search?: string
  take: number
}

export class LocationOptionsValidationError extends Error {
  readonly status = 400
  readonly field: string | undefined

  constructor(message: string, field?: string) {
    super(message)
    this.name = "LocationOptionsValidationError"
    this.field = field
  }
}

export function validateLocationOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedLocationOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = locationOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new LocationOptionsValidationError(
      issue?.message ?? "Invalid location options query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.search?.trim()
  return {
    warehouseId: parsed.warehouseId.trim(),
    search: trimmedSearch ? trimmedSearch : undefined,
    take: parsed.take,
  }
}
