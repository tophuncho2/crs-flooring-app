import { createPendingAdjustmentUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateCreatePendingAdjustmentInput } from "@/app/api/adjustments/_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/work-orders/[id]/adjustments
 *
 * Synchronous create for a single pending adjustment under one WOMI.
 * Calls `createPendingAdjustmentUseCase`, which opens its own TX, asserts
 * WOMI ownership + IDLE status, takes the parent inventory FOR UPDATE
 * lock, stamps the four unit-snapshot fields from the inventory,
 * inserts the row, recomputes `totalCutSum`, and asserts the
 * `<= startingStock` invariant. Returns 200 with the inserted row.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "work-orders.adjustments.pending.create",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/adjustments",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const workOrderId = parseUuidParam(rawId, "id")

    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreatePendingAdjustmentInput)

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.adjustments.pending.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Pending adjustment created",
        action: "work-orders.adjustments.pending.create",
        route: "/api/work-orders/[id]/adjustments",
        entityType: "flooringWorkOrderItem",
        entityId: input.workOrderItemId,
      },
      () =>
        createPendingAdjustmentUseCase({
          variant: "cut",
          workOrderId,
          workOrderItemId: input.workOrderItemId,
          inventoryId: input.inventoryId,
          quantity: input.quantity,
          isWaste: input.isWaste,
          notes: input.notes,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "work-orders.adjustments.pending.create",
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
