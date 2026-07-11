import { deleteWorkOrderUseCase } from "@builders/application"
import { getWorkOrderDetailById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/work-orders/[id]",
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: ({ params }) => getWorkOrderDetailById(params.id),
  buildResponseBody: ({ result }) => ({ workOrder: result }),
})

export const DELETE = createMutationRoute({
  scope: "work-orders.delete",
  route: "/api/work-orders/[id]",
  rateLimit: CRUD_DELETE,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: ({ params }) => getWorkOrderDetailById(params.id, { withNeighbors: false }),
    snapshotKey: "workOrder",
    message: "Work order changed before delete completed. Refresh and try again.",
  },
  useCase: ({ params }) => deleteWorkOrderUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "work-orders.delete",
    message: "Work order deleted",
    entityType: "flooringWorkOrder",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
