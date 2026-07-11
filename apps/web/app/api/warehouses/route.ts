import { createWarehouseUseCase, listWarehousesUseCase } from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import { validateListWarehousesQuery, validateWarehouseInput } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/warehouses",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: (searchParams) => validateListWarehousesQuery(searchParams),
  useCase: ({ input }) => listWarehousesUseCase(input),
})

export const POST = createMutationRoute({
  scope: "warehouses.create",
  route: "/api/warehouses",
  rateLimit: CRUD_CREATE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: validateWarehouseInput,
  useCase: ({ input, access }) => createWarehouseUseCase(input, access.user.email),
  telemetry: {
    action: "warehouses.create",
    message: "Warehouse created",
    entityType: "flooringWarehouse",
  },
  status: 201,
  buildResponseBody: ({ result }) => ({ warehouse: result }),
})
