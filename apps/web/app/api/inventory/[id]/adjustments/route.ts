import {
  createAdjustmentUseCase,
  listInventoryAdjustmentsUseCase,
} from "@builders/application"
import { parseUuidParam } from "@/server/http/api-helpers"
import { createMutationRoute } from "@/server/http/run-mutation"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import {
  validateAdjustmentsPageQuery,
  validateCreateManualAdjustmentInput,
} from "@/app/api/adjustments/_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/inventory/[id]/adjustments
 *
 * Paginated read of adjustments on a single inventory record. Powers the
 * inventory record view's adjustment section. Returns
 * `{ page: EnrichedInventoryAdjustmentPage }`.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/inventory/[id]/adjustments",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const inventoryId = parseUuidParam(rawId, "id")
    const url = new URL(request.url)
    const { skip, take } = validateAdjustmentsPageQuery(url.searchParams)
    const result = await listInventoryAdjustmentsUseCase({
      inventoryId,
      skip,
      take,
    })
    return routeJson(access, { page: result })
  } catch (error) {
    return routeError(access, error)
  }
}

/**
 * POST /api/inventory/[id]/adjustments
 *
 * Synchronous create for a single adjustment (INCREASE or DEDUCTION) on
 * this inventory record. The sole adjustment create endpoint — both the
 * inventory hub and the work-orders record view post here. May optionally carry
 * a WO link (an INCREASE is allowed to link a work order). Calls
 * `createAdjustmentUseCase`, which opens its own TX, takes the parent
 * inventory FOR UPDATE lock, inserts the row, recomputes `netDeducted`, and
 * asserts the `<= startingStock` invariant. Returns 200 with the inserted row.
 */
export const POST = createMutationRoute({
  scope: "inventory.adjustments.manual.create",
  route: "/api/inventory/[id]/adjustments",
  rateLimit: { limit: 600, windowMs: 10 * 60 * 1000 },
  parseParams: async (raw) => ({ inventoryId: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateCreateManualAdjustmentInput,
  useCase: ({ input, access, params }) =>
    createAdjustmentUseCase({
      adjustmentType: input.adjustmentType,
      inventoryId: params.inventoryId,
      warehouseId: input.warehouseId,
      workOrderId: input.workOrderId,
      quantity: input.quantity,
      isWaste: input.isWaste,
      internalNotes: input.internalNotes,
      color: input.color,
      location: input.location,
      area: input.area,
    }, access.user.email),
  telemetry: ({ params }) => ({
    action: "inventory.adjustments.manual.create",
    message: "Manual adjustment created",
    entityType: "flooringInventory",
    entityId: params.inventoryId,
  }),
  status: 200,
  buildResponseBody: ({ result }) => result as unknown as Record<string, unknown>,
})
