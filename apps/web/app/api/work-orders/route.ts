import { createWorkOrderUseCase, listWorkOrdersUseCase } from "@builders/application"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import { validateCreateWorkOrderInput, validateListWorkOrdersQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/work-orders",
  parseInput: (searchParams) => validateListWorkOrdersQuery(searchParams),
  useCase: ({ input }) => listWorkOrdersUseCase(input),
  buildResponseBody: ({ result }) => ({ rows: result.rows, total: result.total }),
})

export const POST = createMutationRoute({
  scope: "work-orders.create",
  route: "/api/work-orders",
  rateLimit: CRUD_CREATE,
  parseInput: validateCreateWorkOrderInput,
  useCase: ({ input, access }) => createWorkOrderUseCase(input, access.user.email),
  telemetry: {
    action: "work-orders.create",
    message: "Work order created",
    entityType: "flooringWorkOrder",
  },
  status: 201,
  buildResponseBody: ({ result }) => ({ workOrder: result }),
})
