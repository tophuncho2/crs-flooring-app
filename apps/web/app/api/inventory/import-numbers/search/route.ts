import { searchInventoryImportNumbersUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateInventoryImportNumberSearchQuery } from "../../_validators"

export const GET = createQueryRoute({
  route: "/api/inventory/import-numbers/search",
  parseInput: (searchParams) => validateInventoryImportNumberSearchQuery(searchParams),
  useCase: ({ input }) => searchInventoryImportNumbersUseCase(input),
})
