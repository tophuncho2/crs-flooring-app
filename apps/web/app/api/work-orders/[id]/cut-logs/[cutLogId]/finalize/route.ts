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
  params: Promise<{ id: string; cutLogId: string }>
}

/**
 * POST /api/work-orders/[id]/cut-logs/[cutLogId]/finalize
 *
 * Synchronous single-row finalize under the work-order scope. Calls
 * `finalizeAdjustmentUseCase` with `{ scope: { kind: "work-order",
 * workOrderId } }`. The use case scope-asserts row → WO membership,
 * locks the parent inventory FOR UPDATE, runs the finalizability gate,
 * stamps `before` / `after` / `finalCutSequence`, flips status to FINAL,
 * and re-snaps `location` via `applyFinalizeCutLog`. Returns 200 with
 * the stamped cut log.
 *
 * Resource-level URL (per [cutLogId]) — symmetric with the inv-side
 * `/api/inventory/[id]/cut-logs/[cutLogId]/finalize`. The legacy
 * collection-level `/api/work-orders/[id]/cut-logs/finalize` was
 * removed in the cut-logs FE sweep.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "work-orders.cut-logs.finalize",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/cut-logs/[cutLogId]/finalize",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, cutLogId: rawCutLogId } = await params
    const workOrderId = parseUuidParam(rawId, "id")
    const cutLogId = parseUuidParam(rawCutLogId, "cutLogId")

    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(body, (value) => value)

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.cut-logs.finalize",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Work-order cut log finalized",
        action: "work-orders.cut-logs.finalize",
        route: "/api/work-orders/[id]/cut-logs/[cutLogId]/finalize",
        entityType: "flooringCutLog",
        entityId: cutLogId,
      },
      () =>
        finalizeAdjustmentUseCase({
          scope: { kind: "work-order", workOrderId },
          adjustmentId: cutLogId,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "work-orders.cut-logs.finalize",
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
