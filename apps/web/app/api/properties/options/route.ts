import { searchPropertyOptionsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validatePropertyOptionsQuery } from "../_validators"

export const GET = createQueryRoute({
  route: "/api/properties/options",
  parseInput: (searchParams) => validatePropertyOptionsQuery(searchParams),
  useCase: ({ input }) => searchPropertyOptionsUseCase(input),
})
