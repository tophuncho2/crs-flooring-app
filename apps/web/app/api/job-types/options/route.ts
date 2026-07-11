import { searchJobTypeOptionsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateJobTypeOptionsQuery } from "../_validators"

export const GET = createQueryRoute({
  route: "/api/job-types/options",
  parseInput: (searchParams) => validateJobTypeOptionsQuery(searchParams),
  useCase: ({ input }) => searchJobTypeOptionsUseCase(input),
  buildResponseBody: ({ result }) => ({ options: result }),
})
