import { updateWorkOrderUseCase } from "@builders/application"
import { getWorkOrderDetailById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateUpdateWorkOrderInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "work-orders.primary.section.replace",
  route: "/api/work-orders/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateUpdateWorkOrderInput,
  concurrency: {
    loadSnapshot: ({ params }) => getWorkOrderDetailById(params.id, { withNeighbors: false }),
    snapshotKey: "workOrder",
    message: "Work order changed before section save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) => updateWorkOrderUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "work-orders.primary.section.replace",
    message: "Work order primary section replaced",
    entityType: "flooringWorkOrder",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: ({ result }) => ({ workOrder: result }),
})
