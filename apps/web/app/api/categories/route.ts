import { listCategoriesUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateListCategoriesQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/categories",
  parseInput: (searchParams) => validateListCategoriesQuery(searchParams),
  useCase: ({ input }) => listCategoriesUseCase(input),
})
