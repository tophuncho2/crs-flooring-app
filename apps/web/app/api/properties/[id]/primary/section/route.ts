import { updatePropertyUseCase } from "@builders/application"
import { getPropertyById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateUpdatePropertyInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "properties.primary.section.replace",
  route: "/api/properties/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateUpdatePropertyInput,
  concurrency: {
    loadSnapshot: ({ params }) => getPropertyById(params.id, { withNeighbors: false }),
    snapshotKey: "property",
    message: "Property changed before section save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) => updatePropertyUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "properties.primary.section.replace",
    message: "Property primary section replaced",
    entityType: "flooringProperty",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: ({ result }) => ({ property: result }),
})
