import { searchTemplateOptionsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validateTemplateOptionsQuery } from "../_validators"

export const GET = createQueryRoute({
  route: "/api/templates/options",
  parseInput: (searchParams) => validateTemplateOptionsQuery(searchParams),
  useCase: ({ input }) => searchTemplateOptionsUseCase(input),
})
