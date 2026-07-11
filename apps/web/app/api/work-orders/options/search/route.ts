import { searchWorkOrderOptionsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateWorkOrderOptionsSearchQuery } from "../../_validators"

/**
 * GET /api/work-orders/options/search
 *
 * Async picker for the adjustment relink "Work order" dropdown. Not
 * warehouse-scoped and not status-scoped: adjustments cross-source inventory
 * across warehouses, so the picker offers WOs from any warehouse and any
 * status (completed included). An optional `productId` filter still narrows
 * to WOs carrying that product when supplied.
 */
export const GET = createQueryRoute({
  route: "/api/work-orders/options/search",
  parseInput: (searchParams) => validateWorkOrderOptionsSearchQuery(searchParams),
  useCase: ({ input }) => searchWorkOrderOptionsUseCase(input),
})
