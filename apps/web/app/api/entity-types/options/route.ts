import { searchEntityTypeOptionsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateEntityTypeOptionsQuery } from "../_validators"

export const GET = createQueryRoute({
  route: "/api/entity-types/options",
  parseInput: (searchParams) => validateEntityTypeOptionsQuery(searchParams),
  useCase: ({ input }) => searchEntityTypeOptionsUseCase(input),
})
