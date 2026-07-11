import { searchCategoryOptionsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateCategoryOptionsQuery } from "../_validators"

export const GET = createQueryRoute({
  route: "/api/categories/options",
  parseInput: (searchParams) => validateCategoryOptionsQuery(searchParams),
  useCase: ({ input }) => searchCategoryOptionsUseCase(input),
})
