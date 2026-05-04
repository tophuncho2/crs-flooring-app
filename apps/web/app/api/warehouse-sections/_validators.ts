import { z } from "zod"

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const sectionOptionsQuerySchema = z.object({
  warehouseId: z.string().min(1, "warehouseId is required"),
  search: z.string().optional(),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(OPTIONS_MAX_TAKE)
    .default(OPTIONS_DEFAULT_TAKE),
})

export type ValidatedSectionOptionsQuery = {
  warehouseId: string
  search?: string
  take: number
}

export class SectionOptionsValidationError extends Error {
  readonly status = 400
  readonly field: string | undefined

  constructor(message: string, field?: string) {
    super(message)
    this.name = "SectionOptionsValidationError"
    this.field = field
  }
}

export function validateSectionOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedSectionOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = sectionOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new SectionOptionsValidationError(
      issue?.message ?? "Invalid section options query",
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
