import { syncTemplateToWorkOrderUseCase } from "@builders/application"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateSyncTemplateToWorkOrderInput } from "../_validators"

export const POST = createMutationRoute({
  scope: "work-orders.from-template",
  route: "/api/work-orders/from-template",
  rateLimit: { limit: 20, windowMs: 10 * 60 * 1000 },
  parseInput: validateSyncTemplateToWorkOrderInput,
  useCase: ({ input, access }) => syncTemplateToWorkOrderUseCase(input, access.user.email),
  telemetry: {
    action: "work-orders.from-template",
    message: "Work order synced from template",
    entityType: "flooringWorkOrder",
  },
  status: 201,
  buildResponseBody: ({ result }) => ({ workOrder: result.workOrder, items: result.items }),
})
