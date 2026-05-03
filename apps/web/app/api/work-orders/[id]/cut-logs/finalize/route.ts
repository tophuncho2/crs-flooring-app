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
 * Producer route for the WO-scoped single-row finalize flow. Each
 * request finalizes exactly one cut log under one inventory; multiple
 * back-to-back finalizes on the same WOMI queue cleanly because the
 * WOMI status is no longer consulted.
 *
 * Calls `finalizeWorkOrderCutLogUseCase`, which validates the row's
 * finalizability and writes a `flooring.work-order.cut-log.finalize`
 * outbox event. Returns 202 Accepted; the worker then takes the parent
 * inventory's row lock and stamps `before` / `after` /
 * `finalCutSequence`.
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

    const requestedBy = { userId: access.user.id, userEmail: access.user.email }

    const result = await withMutationTelemetry(
      access,
      {
        message: "Work-order cut-log finalize queued",
        action: "work-orders.cut-logs.finalize",
        route: "/api/work-orders/[id]/cut-logs/finalize",
        entityType: "flooringWorkOrder",
        entityId: workOrderId,
      },
      () =>
        finalizeWorkOrderCutLogUseCase({
          workOrderId,
          requestKey: input.requestKey,
          cutLogId: input.cutLogId,
          requestedBy,
        }),
    )

    const responseBody = { finalize: result }
    await finalizeMutationReceipt({
      scope: "work-orders.cut-logs.finalize",
      access,
      mutation,
      responseStatus: 202,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 202 })
  } catch (error) {
    return routeError(access, error)
  }
}
