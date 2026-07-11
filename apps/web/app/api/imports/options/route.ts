import { searchImportOptionsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateImportOptionsQuery } from "../_validators"

export const GET = createQueryRoute({
  route: "/api/imports/options",
  parseInput: (searchParams) => validateImportOptionsQuery(searchParams),
  useCase: ({ input }) => searchImportOptionsUseCase(input),
})
