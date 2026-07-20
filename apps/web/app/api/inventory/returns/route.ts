import { createReturnUseCase } from "@builders/application"
import { getInventoryDetailById } from "@builders/db"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateCreateReturnInput } from "../_validators"

/**
 * POST /api/inventory/returns — create a "return": one NEW inventory row
 * (startingStock "0", cost/freight null) PLUS one INCREASE adjustment (quantity
 * = the returned amount) on that row, in a single transaction. No import / PO#
 * provenance and no expected-updated-at check (fresh insert); the mutation
 * receipt guards against double-creation on retry. Returns the full detail (row
 * + its lone adjustment) so the launching surface can reconcile in place.
 */
export const POST = createMutationRoute({
  scope: "inventory.returns.create",
  route: "/api/inventory/returns",
  rateLimit: CRUD_CREATE,
  requireExpectedUpdatedAt: false,
  parseInput: validateCreateReturnInput,
  useCase: ({ input, access }) => createReturnUseCase(input, access.user.email),
  telemetry: {
    action: "inventory.returns.create",
    message: "Return created",
    entityType: "flooringInventory",
  },
  status: 200,
  buildResponseBody: async ({ result }) => {
    const inventory =
      (await getInventoryDetailById(result.inventory.id, { withNeighbors: false })) ??
      result.inventory
    return { inventory, adjustment: result.adjustment }
  },
})
