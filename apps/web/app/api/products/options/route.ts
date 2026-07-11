import { searchProductOptionsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateProductOptionsQuery } from "../_validators"

export const GET = createQueryRoute({
  route: "/api/products/options",
  parseInput: (searchParams) => validateProductOptionsQuery(searchParams),
  useCase: ({ input }) => searchProductOptionsUseCase(input),
})
