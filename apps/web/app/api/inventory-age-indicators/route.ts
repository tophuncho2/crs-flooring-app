import {
  createInventoryAgeIndicatorUseCase,
  listInventoryAgeIndicatorsUseCase,
} from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import {
  validateCreateInventoryAgeIndicatorInput,
  validateListInventoryAgeIndicatorsQuery,
} from "./_validators"

export const GET = createQueryRoute({
  route: "/api/inventory-age-indicators",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: (searchParams) => validateListInventoryAgeIndicatorsQuery(searchParams),
  useCase: ({ input }) => listInventoryAgeIndicatorsUseCase(input),
})

export const POST = createMutationRoute({
  scope: "inventoryAgeIndicators.create",
  route: "/api/inventory-age-indicators",
  rateLimit: CRUD_CREATE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: validateCreateInventoryAgeIndicatorInput,
  useCase: ({ input, access }) =>
    createInventoryAgeIndicatorUseCase(input, access.user.email),
  telemetry: {
    action: "inventoryAgeIndicators.create",
    message: "Inventory age indicator created",
    entityType: "flooringInventoryAgeIndicator",
  },
  status: 201,
  buildResponseBody: ({ result }) => ({ inventoryAgeIndicator: result }),
})
