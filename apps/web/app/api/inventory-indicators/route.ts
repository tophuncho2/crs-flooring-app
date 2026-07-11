import { listIndicatorsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateIndicatorsListQuery } from "./_validators"

/**
 * GET /api/inventory-indicators
 *
 * Standalone list of all inventory indicators (the nav list view). Read-only —
 * the list has no create; rows open into the parent product record view.
 */
export const GET = createQueryRoute({
  route: "/api/inventory-indicators",
  parseInput: (searchParams) => validateIndicatorsListQuery(searchParams),
  useCase: ({ input }) => listIndicatorsUseCase(input),
})
