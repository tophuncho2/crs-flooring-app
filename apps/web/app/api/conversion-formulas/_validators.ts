import {
  failValidation,
  optionsQuerySchema,
  parseQuery,
} from "@/app/api/_shared/validators"

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

const conversionFormulaOptionsQuerySchema = optionsQuerySchema({
  takeMax: OPTIONS_MAX_TAKE,
  takeDefault: OPTIONS_DEFAULT_TAKE,
})

export type ValidatedConversionFormulaOptionsQuery = {
  search?: string
  skip: number
  take: number
}

export function validateConversionFormulaOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedConversionFormulaOptionsQuery {
  const parsed = parseQuery(
    searchParams,
    conversionFormulaOptionsQuerySchema,
    failValidation,
    "Invalid conversion formula options query",
  )
  const trimmed = parsed.search?.trim()
  return {
    search: trimmed ? trimmed : undefined,
    skip: parsed.skip,
    take: parsed.take,
  }
}
