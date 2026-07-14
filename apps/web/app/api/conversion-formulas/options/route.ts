import { searchConversionFormulaOptionsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateConversionFormulaOptionsQuery } from "../_validators"

export const GET = createQueryRoute({
  route: "/api/conversion-formulas/options",
  parseInput: (searchParams) => validateConversionFormulaOptionsQuery(searchParams),
  useCase: ({ input }) => searchConversionFormulaOptionsUseCase(input),
})
