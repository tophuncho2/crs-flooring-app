import { createTemplateUseCase, listTemplatesUseCase } from "@builders/application"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import { validateCreateTemplateInput, validateListTemplatesQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/templates",
  parseInput: (searchParams) => validateListTemplatesQuery(searchParams),
  useCase: ({ input }) => listTemplatesUseCase(input),
})

export const POST = createMutationRoute({
  scope: "templates.create",
  route: "/api/templates",
  rateLimit: CRUD_CREATE,
  parseInput: validateCreateTemplateInput,
  useCase: ({ input, access }) => createTemplateUseCase(input, access.user.email),
  telemetry: { action: "templates.create", message: "Template created", entityType: "template" },
  status: 201,
  buildResponseBody: ({ result }) => ({ template: result }),
})
