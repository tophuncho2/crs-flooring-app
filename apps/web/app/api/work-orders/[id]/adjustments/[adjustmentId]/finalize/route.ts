import { finalizeAdjustmentUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string; adjustmentId: string }>
}

/**
 * POST /api/work-orders/[id]/adjustments/[adjustmentId]/finalize
 *
 * Synchronous single-row finalize under the work-order scope. Calls
 * `finalizeAdjustmentUseCase` with `{ scope: { kind: "work-order",
 * workOrderId } }`. The use case scope-asserts row → WO membership,
 * locks the parent inventory FOR UPDATE, runs the finalizability gate,
 * stamps `before` / `after` / `finalCutSequence`, flips status to FINAL,
 * and re-snaps `location` via `applyFinalizeAdjustment`. Returns 200 with
 * the stamped adjustment.
 *
 * Resource-level URL (per [adjustmentId]) — symmetric with the inv-side
 * `/api/inventory/[id]/adjustments/[adjustmentId]/finalize`. The legacy
 * collection-level `/api/work-orders/[id]/adjustments/finalize` was
 * removed in the adjustments FE sweep.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "work-orders.adjustments.finalize",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/adjustments/[adjustmentId]/finalize",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, adjustmentId: rawAdjustmentId } = await params
    const workOrderId = parseUuidParam(rawId, "id")
    const adjustmentId = parseUuidParam(rawAdjustmentId, "adjustmentId")

    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(body, (value) => value)

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.adjustments.finalize",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Work-order adjustment finalized",
        action: "work-orders.adjustments.finalize",
        route: "/api/work-orders/[id]/adjustments/[adjustmentId]/finalize",
        entityType: "flooringAdjustment",
        entityId: adjustmentId,
      },
      () =>
        finalizeAdjustmentUseCase({
          scope: { kind: "work-order", workOrderId },
          adjustmentId: adjustmentId,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "work-orders.adjustments.finalize",
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
