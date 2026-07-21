import { saveWorkOrderEntityInvolvementSectionUseCase } from "@builders/application"
import { getWorkOrderDetailById, listWorkOrderEntityInvolvements } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateWorkOrderEntityInvolvementsDiffInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "work-orders.entity-involvement.section.replace",
  route: "/api/work-orders/[id]/entity-involvement/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateWorkOrderEntityInvolvementsDiffInput,
  concurrency: {
    loadSnapshot: ({ params }) => getWorkOrderDetailById(params.id, { withNeighbors: false }),
    snapshotKey: "workOrder",
    message: "Work order changed before entity involvement save completed. Refresh and try again.",
  },
  useCase: ({ input: diff, access, params }) =>
    saveWorkOrderEntityInvolvementSectionUseCase({ workOrderId: params.id, diff }, access.user.email),
  telemetry: ({ params }) => ({
    action: "work-orders.entity-involvement.section.replace",
    message: "Work order entity involvement section replaced",
    entityType: "flooringWorkOrder",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: async ({ result, params }) => {
    const [detail, entityInvolvements] = await Promise.all([
      getWorkOrderDetailById(params.id),
      listWorkOrderEntityInvolvements(params.id),
    ])
    return {
      workOrder: detail,
      entityInvolvements,
      tempIdMap: result.tempIdMap,
    }
  },
})
