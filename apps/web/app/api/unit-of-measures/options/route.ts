import { searchUnitOfMeasureOptionsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateUnitOfMeasureOptionsQuery } from "../_validators"

export const GET = createQueryRoute({
  route: "/api/unit-of-measures/options",
  parseInput: (searchParams) => validateUnitOfMeasureOptionsQuery(searchParams),
  useCase: ({ input }) => searchUnitOfMeasureOptionsUseCase(input),
})
