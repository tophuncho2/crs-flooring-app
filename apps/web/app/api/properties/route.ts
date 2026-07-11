import { createPropertyUseCase, listPropertiesUseCase } from "@builders/application"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import { validateCreatePropertyInput, validateListPropertiesQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/properties",
  parseInput: (searchParams) => validateListPropertiesQuery(searchParams),
  useCase: ({ input }) => listPropertiesUseCase(input),
})

export const POST = createMutationRoute({
  scope: "properties.create",
  route: "/api/properties",
  rateLimit: CRUD_CREATE,
  parseInput: validateCreatePropertyInput,
  useCase: ({ input, access }) => createPropertyUseCase(input, access.user.email),
  telemetry: {
    action: "properties.create",
    message: "Property created",
    entityType: "flooringProperty",
  },
  status: 201,
  buildResponseBody: ({ result }) => ({ property: result }),
})
