import { searchEntityOptionsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateEntityOptionsQuery } from "../_validators"

export const GET = createQueryRoute({
  route: "/api/entities/options",
  parseInput: (searchParams) => validateEntityOptionsQuery(searchParams),
  useCase: ({ input }) => searchEntityOptionsUseCase(input),
})
