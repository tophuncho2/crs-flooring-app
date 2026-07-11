import { searchInventoryLocationsForWarehouseUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateInventoryLocationsSearchQuery } from "../../_validators"

export const GET = createQueryRoute({
  route: "/api/inventory/locations/search",
  parseInput: (searchParams) => validateInventoryLocationsSearchQuery(searchParams),
  useCase: ({ input }) => searchInventoryLocationsForWarehouseUseCase(input),
})
