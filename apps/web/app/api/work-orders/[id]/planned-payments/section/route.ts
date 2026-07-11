import { saveWorkOrderPlannedPaymentsSectionUseCase } from "@builders/application"
import { getWorkOrderDetailById, listWorkOrderPlannedPayments } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateWorkOrderPlannedPaymentsDiffInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "work-orders.planned-payments.section.replace",
  route: "/api/work-orders/[id]/planned-payments/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateWorkOrderPlannedPaymentsDiffInput,
  concurrency: {
    loadSnapshot: ({ params }) => getWorkOrderDetailById(params.id, { withNeighbors: false }),
    snapshotKey: "workOrder",
    message: "Work order changed before planned payments save completed. Refresh and try again.",
  },
  useCase: ({ input: diff, access, params }) =>
    saveWorkOrderPlannedPaymentsSectionUseCase({ workOrderId: params.id, diff }, access.user.email),
  telemetry: ({ params }) => ({
    action: "work-orders.planned-payments.section.replace",
    message: "Work order planned payments section replaced",
    entityType: "flooringWorkOrder",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: async ({ result, params }) => {
    const [detail, plannedPayments] = await Promise.all([
      getWorkOrderDetailById(params.id),
      listWorkOrderPlannedPayments(params.id),
    ])
    return {
      workOrder: detail,
      plannedPayments,
      tempIdMap: result.tempIdMap,
    }
  },
})
