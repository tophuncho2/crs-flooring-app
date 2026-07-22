import { updateInventoryAgeIndicatorUseCase } from "@builders/application"
import { getInventoryAgeIndicatorById } from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateUpdateInventoryAgeIndicatorInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "inventoryAgeIndicators.primary.section.replace",
  route: "/api/inventory-age-indicators/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateUpdateInventoryAgeIndicatorInput,
  concurrency: {
    loadSnapshot: ({ params }) => getInventoryAgeIndicatorById(params.id),
    snapshotKey: "inventoryAgeIndicator",
    message:
      "Inventory age indicator changed before section save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) =>
    updateInventoryAgeIndicatorUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "inventoryAgeIndicators.primary.section.replace",
    message: "Inventory age indicator primary section replaced",
    entityType: "flooringInventoryAgeIndicator",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: ({ result }) => ({ inventoryAgeIndicator: result }),
})
