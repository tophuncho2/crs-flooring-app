import { finalizeWorkOrderCutLogUseCase } from "@builders/application"
import { WORK_ORDERS_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateFinalizeWorkOrderCutLogInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/work-orders/[id]/cut-logs/finalize
 *
 * Synchronous single-row finalize. Calls `finalizeWorkOrderCutLogUseCase`,
 * which locks the parent inventory FOR UPDATE, validates finalizability,
 * stamps `before` / `after` / `finalCutSequence` and flips status to FINAL
 * in one TX. Returns 200 with the stamped cut log row. Idempotency is
 * provided by the `canFinalizeCutLog` predicate (already-FINAL rows return
 * 409) plus the standard mutation-receipt window.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: WORK_ORDERS_TOOL_SLUG,
    rateLimit: {
      scope: "work-orders.cut-logs.finalize",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/cut-logs/finalize",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const workOrderId = parseUuidParam(rawId, "id")

    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(
      body,
      validateFinalizeWorkOrderCutLogInput,
    )

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
        message: "Work-order cut-log finalized",
        action: "work-orders.cut-logs.finalize",
        route: "/api/work-orders/[id]/cut-logs/finalize",
        entityType: "flooringCutLog",
        entityId: input.cutLogId,
      },
      () =>
        finalizeWorkOrderCutLogUseCase({
          workOrderId,
          cutLogId: input.cutLogId,
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
