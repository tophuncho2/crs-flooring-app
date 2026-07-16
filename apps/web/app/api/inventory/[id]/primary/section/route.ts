import { getInventoryById, getInventoryDetailById } from "@builders/db"
import { InventoryExecutionError, updateInventoryUseCase } from "@builders/application"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateUpdateInventoryInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "inventory.primary.section.replace",
  route: "/api/inventory/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => ({ id: (raw as { id: string }).id }),
  parseInput: validateUpdateInventoryInput,
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
  useCase: ({ input, access, params }) => updateInventoryUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "inventory.primary.section.replace",
    message: "Inventory primary section updated",
    entityType: "flooringInventory",
    entityId: params.id,
  }),
  status: 200,
  // Client controller expects InventoryDetailRecord (row + adjustments) so the
  // record view reconciler can re-render the adjustments section after save. The
  // use case returns a lean `{ id }`; this is the single post-commit read (the
  // detail includes the row, so no separate row enrich is needed).
  buildResponseBody: async ({ result }) => {
    const detail = await getInventoryDetailById(result.id)
    if (!detail) {
      throw new InventoryExecutionError({
        code: "INVENTORY_NOT_FOUND",
        message: "Inventory row not found.",
        status: 404,
      })
    }
    return { inventory: detail }
  },
})
