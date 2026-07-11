import { createPropertyHubUseCase } from "@builders/application"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateCreatePropertyHubInput } from "./_validators"

export const POST = createMutationRoute({
  scope: "properties.hub.create",
  route: "/api/properties/hub",
  rateLimit: CRUD_CREATE,
  parseInput: validateCreatePropertyHubInput,
  useCase: ({ input, access }) => createPropertyHubUseCase(input, access.user.email),
  telemetry: {
    action: "properties.hub.create",
    message: "Property hub created",
    entityType: "flooringProperty",
  },
  status: 201,
  buildResponseBody: ({ result }) => ({ property: result.property, entity: result.entity }),
})
