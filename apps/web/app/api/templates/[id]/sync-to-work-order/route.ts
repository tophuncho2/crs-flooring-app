import { syncTemplateToWorkOrderUseCase } from "@builders/application"
import { parseUuidParam } from "@/server/http/api-helpers"
import { createMutationRoute } from "@/server/http/run-mutation"

export const POST = createMutationRoute({
  scope: "templates.sync-to-work-order",
  route: "/api/templates/[id]/sync-to-work-order",
  rateLimit: { limit: 20, windowMs: 10 * 60 * 1000 },
  parseParams: async (raw) => ({ templateId: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: ({ access, params }) =>
    syncTemplateToWorkOrderUseCase({ templateId: params.templateId }, access.user.email),
  telemetry: {
    action: "templates.sync-to-work-order",
    message: "Work order synced from template",
    entityType: "flooringWorkOrder",
  },
  status: 201,
  buildResponseBody: ({ result }) => ({ workOrder: result.workOrder, items: result.items }),
})
