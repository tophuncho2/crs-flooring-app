import {
  createEntityUseCase,
  listEntitiesUseCase,
} from "@builders/application"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import {
  validateCreateEntityInput,
  validateListEntitiesQuery,
} from "./_validators"

export const GET = createQueryRoute({
  route: "/api/entities",
  parseInput: (searchParams) => validateListEntitiesQuery(searchParams),
  useCase: ({ input }) => listEntitiesUseCase(input),
})

export const POST = createMutationRoute({
  scope: "entities.create",
  route: "/api/entities",
  rateLimit: CRUD_CREATE,
  parseInput: validateCreateEntityInput,
  useCase: ({ input, access }) => createEntityUseCase(input, access.user.email),
  telemetry: {
    action: "entities.create",
    message: "Entity created",
    entityType: "entity",
  },
  status: 201,
  buildResponseBody: ({ result }) => ({ entity: result }),
})
