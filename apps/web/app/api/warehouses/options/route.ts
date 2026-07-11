import { searchWarehouseOptionsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateWarehouseOptionsQuery } from "../_validators"

export const GET = createQueryRoute({
  route: "/api/warehouses/options",
  parseInput: (searchParams) => validateWarehouseOptionsQuery(searchParams),
  useCase: ({ input }) => searchWarehouseOptionsUseCase(input),
})
