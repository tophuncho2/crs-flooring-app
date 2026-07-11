import { listAdjustmentsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateAdjustmentsListQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/adjustments",
  parseInput: (searchParams) => validateAdjustmentsListQuery(searchParams),
  useCase: ({ input }) => listAdjustmentsUseCase(input),
})
