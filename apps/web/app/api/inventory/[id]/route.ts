import { getInventoryById, getInventoryDetailById } from "@builders/db"
import { InventoryExecutionError, deleteInventoryUseCase } from "@builders/application"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/inventory/[id]",
  parseParams: async (raw) => ({ id: (raw as { id: string }).id }),
  parseInput: () => ({}),
  useCase: ({ params }) => getInventoryDetailById(params.id),
  buildResponseBody: ({ result }) => ({ inventory: result }),
})

export const DELETE = createMutationRoute({
  scope: "inventory.delete",
  route: "/api/inventory/[id]",
  rateLimit: CRUD_DELETE,
  parseParams: async (raw) => ({ id: (raw as { id: string }).id }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: async ({ params }) => {
      const currentSnapshot = await getInventoryById(params.id)
      if (!currentSnapshot) {
        throw new InventoryExecutionError({
          code: "INVENTORY_NOT_FOUND",
          message: "Inventory row not found.",
          status: 404,
        })
      }
      return currentSnapshot
    },
    snapshotKey: "inventory",
    message: "Inventory row changed before save completed. Refresh and try again.",
  },
  useCase: ({ params }) => deleteInventoryUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "inventory.delete",
    message: "Inventory row deleted",
    entityType: "flooringInventory",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true }),
})
