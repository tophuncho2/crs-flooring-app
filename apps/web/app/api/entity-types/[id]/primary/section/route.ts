import { updateEntityTypeUseCase } from "@builders/application"
import { getEntityTypeById } from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateUpdateEntityTypeInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "entityTypes.primary.section.replace",
  route: "/api/entity-types/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateUpdateEntityTypeInput,
  concurrency: {
    loadSnapshot: ({ params }) => getEntityTypeById(params.id),
    snapshotKey: "entityType",
    message: "Entity type changed before section save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) => updateEntityTypeUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "entityTypes.primary.section.replace",
    message: "Entity type primary section replaced",
    entityType: "flooringEntityType",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: ({ result }) => ({ entityType: result }),
})
