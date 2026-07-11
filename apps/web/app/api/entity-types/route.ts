import {
  createEntityTypeUseCase,
  listEntityTypesUseCase,
} from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import {
  validateCreateEntityTypeInput,
  validateListEntityTypesQuery,
} from "./_validators"

export const GET = createQueryRoute({
  route: "/api/entity-types",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: (searchParams) => validateListEntityTypesQuery(searchParams),
  useCase: ({ input }) => listEntityTypesUseCase(input),
})

export const POST = createMutationRoute({
  scope: "entityTypes.create",
  route: "/api/entity-types",
  rateLimit: CRUD_CREATE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: validateCreateEntityTypeInput,
  useCase: ({ input, access }) => createEntityTypeUseCase(input, access.user.email),
  telemetry: {
    action: "entityTypes.create",
    message: "Entity type created",
    entityType: "flooringEntityType",
  },
  status: 201,
  buildResponseBody: ({ result }) => ({ entityType: result }),
})
