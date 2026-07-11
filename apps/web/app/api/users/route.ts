import { listUsersUseCase } from "@builders/application"
import { USER_MANAGEMENT_MIN_RANK } from "@builders/domain"
import { createQueryRoute } from "@/server/http/run-query"
import { validateListUsersQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/users",
  minRank: USER_MANAGEMENT_MIN_RANK,
  parseInput: (searchParams) => validateListUsersQuery(searchParams),
  useCase: ({ input }) => listUsersUseCase(input),
})
