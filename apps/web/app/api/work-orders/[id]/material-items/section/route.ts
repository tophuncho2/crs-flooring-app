import { saveWorkOrderMaterialItemsSectionUseCase } from "@builders/application"
import { getWorkOrderDetailById, listWorkOrderMaterialItems } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateWorkOrderMaterialItemsDiffInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "work-orders.material-items.section.replace",
  route: "/api/work-orders/[id]/material-items/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateWorkOrderMaterialItemsDiffInput,
  concurrency: {
    loadSnapshot: ({ params }) => getWorkOrderDetailById(params.id, { withNeighbors: false }),
    snapshotKey: "workOrder",
    message: "Work order changed before material items save completed. Refresh and try again.",
  },
  useCase: ({ input: diff, access, params }) =>
    saveWorkOrderMaterialItemsSectionUseCase({ workOrderId: params.id, diff }, access.user.email),
  telemetry: ({ params }) => ({
    action: "work-orders.material-items.section.replace",
    message: "Work order material items section replaced",
    entityType: "flooringWorkOrder",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: async ({ result, params }) => {
    const [detail, materialItems] = await Promise.all([
      getWorkOrderDetailById(params.id),
      listWorkOrderMaterialItems(params.id),
    ])
    return {
      workOrder: detail,
      materialItems,
      tempIdMap: result.tempIdMap,
    }
  },
})
