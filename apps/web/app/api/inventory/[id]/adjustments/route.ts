import {
  createPendingAdjustmentUseCase,
  listInventoryAdjustmentsUseCase,
} from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
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
 * Synchronous create for a single pending **manual** adjustment (INCREASE or
 * DEDUCTION) on this inventory record, created from the inventory hub. Never
 * WO-linked, never waste. Calls `createPendingAdjustmentUseCase` with
 * `variant: "manual"`, which opens its own TX, takes the parent inventory
 * FOR UPDATE lock, inserts the row, recomputes `netDeducted`, and asserts the
 * `<= startingStock` invariant. Returns 200 with the inserted row.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "inventory.adjustments.manual.create",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]/adjustments",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const inventoryId = parseUuidParam(rawId, "id")

    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateManualAdjustmentInput)

    const receipt = await enforceMutationReceipt({
      scope: "inventory.adjustments.manual.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Manual adjustment created",
        action: "inventory.adjustments.manual.create",
        route: "/api/inventory/[id]/adjustments",
        entityType: "flooringInventory",
        entityId: inventoryId,
      },
      () =>
        createPendingAdjustmentUseCase({
          variant: "manual",
          adjustmentType: input.adjustmentType,
          inventoryId,
          quantity: input.quantity,
          notes: input.notes,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "inventory.adjustments.manual.create",
      access,
      mutation,
      responseStatus: 200,
      responseBody: responseBody as unknown as Record<string, unknown>,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
