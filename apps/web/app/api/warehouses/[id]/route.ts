import { deleteWarehouseUseCase, WarehouseExecutionError } from "@builders/application"
import { getWarehouseById, getWarehouseDetailById } from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/warehouses/[id]",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: async ({ params }) => {
    const warehouse = await getWarehouseDetailById(params.id, { withNeighbors: true })
    if (!warehouse) {
      throw new WarehouseExecutionError({
        code: "WAREHOUSE_NOT_FOUND",
        message: "Warehouse not found",
        status: 404,
      })
    }
    return warehouse
  },
  buildResponseBody: ({ result }) => ({ warehouse: result }),
})

export const DELETE = createMutationRoute({
  scope: "warehouses.delete",
  route: "/api/warehouses/[id]",
  rateLimit: CRUD_DELETE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: async ({ params }) => {
      const snapshot = await getWarehouseById(params.id)
      if (!snapshot) {
        throw new WarehouseExecutionError({
          code: "WAREHOUSE_NOT_FOUND",
          message: "Warehouse not found",
          status: 404,
        })
      }
      return snapshot
    },
    snapshotKey: "warehouse",
    message: "Warehouse changed before delete completed. Refresh and try again.",
  },
  useCase: ({ params }) => deleteWarehouseUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "warehouses.delete",
    message: "Warehouse deleted",
    entityType: "flooringWarehouse",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
