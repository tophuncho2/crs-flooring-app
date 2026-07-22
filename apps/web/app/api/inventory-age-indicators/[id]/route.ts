import {
  deleteInventoryAgeIndicatorUseCase,
  InventoryAgeIndicatorExecutionError,
} from "@builders/application"
import {
  getInventoryAgeIndicatorById,
  getInventoryAgeIndicatorDetailById,
} from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK, INVENTORY_AGE_INDICATOR_NOT_FOUND_MESSAGE } from "@builders/domain"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/inventory-age-indicators/[id]",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: async ({ params }) => {
    const indicator = await getInventoryAgeIndicatorDetailById(params.id, { withNeighbors: true })
    if (!indicator) {
      throw new InventoryAgeIndicatorExecutionError({
        code: "INVENTORY_AGE_INDICATOR_NOT_FOUND",
        message: INVENTORY_AGE_INDICATOR_NOT_FOUND_MESSAGE,
        status: 404,
      })
    }
    return indicator
  },
  buildResponseBody: ({ result }) => ({ inventoryAgeIndicator: result }),
})

export const DELETE = createMutationRoute({
  scope: "inventoryAgeIndicators.delete",
  route: "/api/inventory-age-indicators/[id]",
  rateLimit: CRUD_DELETE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: ({ params }) => getInventoryAgeIndicatorById(params.id),
    snapshotKey: "inventoryAgeIndicator",
    message: "Inventory age indicator changed before delete completed. Refresh and try again.",
  },
  useCase: ({ params }) => deleteInventoryAgeIndicatorUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "inventoryAgeIndicators.delete",
    message: "Inventory age indicator deleted",
    entityType: "flooringInventoryAgeIndicator",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
