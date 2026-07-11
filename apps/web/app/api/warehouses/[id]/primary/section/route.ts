import { updateWarehouseUseCase, WarehouseExecutionError } from "@builders/application"
import { getWarehouseById } from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateWarehouseInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "warehouses.primary.section.replace",
  route: "/api/warehouses/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateWarehouseInput,
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
    message: "Warehouse changed before section save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) => updateWarehouseUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "warehouses.primary.section.replace",
    message: "Warehouse primary section replaced",
    entityType: "flooringWarehouse",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: ({ result }) => ({ warehouse: result }),
})
