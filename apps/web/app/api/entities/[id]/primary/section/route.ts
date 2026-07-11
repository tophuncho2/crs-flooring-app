import { updateEntityUseCase } from "@builders/application"
import { getEntityById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateUpdateEntityInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "entities.primary.section.replace",
  route: "/api/entities/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateUpdateEntityInput,
  concurrency: {
    loadSnapshot: ({ params }) => getEntityById(params.id, { withNeighbors: false }),
    snapshotKey: "entity",
    message: "Entity changed before section save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) => updateEntityUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "entities.primary.section.replace",
    message: "Entity primary section replaced",
    entityType: "entity",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: ({ result }) => ({ entity: result }),
})
