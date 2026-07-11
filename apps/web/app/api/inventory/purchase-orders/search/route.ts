import { searchInventoryPurchaseOrderNumbersUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateInventoryPurchaseOrderSearchQuery } from "../../_validators"

export const GET = createQueryRoute({
  route: "/api/inventory/purchase-orders/search",
  parseInput: (searchParams) => validateInventoryPurchaseOrderSearchQuery(searchParams),
  useCase: ({ input }) => searchInventoryPurchaseOrderNumbersUseCase(input),
})
