import { listUnitOfMeasuresUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateListUnitOfMeasuresQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/unit-of-measures",
  parseInput: (searchParams) => validateListUnitOfMeasuresQuery(searchParams),
  useCase: ({ input }) => listUnitOfMeasuresUseCase(input),
})
