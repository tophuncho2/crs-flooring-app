import { listUserLoginActivityUseCase } from "@builders/application"
import { USER_MANAGEMENT_MIN_RANK } from "@builders/domain"
import { createQueryRoute } from "@/server/http/run-query"
import { validateListUserActivityQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/user-activity",
  minRank: USER_MANAGEMENT_MIN_RANK,
  parseInput: (searchParams) => validateListUserActivityQuery(searchParams),
  useCase: ({ input }) => listUserLoginActivityUseCase(input),
})
