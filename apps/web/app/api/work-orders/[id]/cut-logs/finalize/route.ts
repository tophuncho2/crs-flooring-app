import { finalizeWorkOrderCutLogBatchUseCase } from "@builders/application"
import { WORK_ORDERS_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateFinalizeWorkOrderCutLogBatchInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/work-orders/[id]/cut-logs/finalize
 *
 * Producer route for the WO-scoped finalize-batch flow. The selection
 * may span multiple WOMIs and multiple inventories under one work
 * order. Calls `finalizeWorkOrderCutLogBatchUseCase`, which validates
 * each row's finalizability, transitions every touched WOMI
 * `IDLE → FINALIZING`, and writes a
 * `flooring.work-order.cut-log.finalize` outbox event.
 *
 * Returns 202 Accepted; the worker locks touched inventories
 * deterministically and stamps `finalCutSequence` per inventory.
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
      validateFinalizeWorkOrderCutLogBatchInput,
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
        message: "Work-order cut-log finalize batch queued",
        action: "work-orders.cut-logs.finalize",
        route: "/api/work-orders/[id]/cut-logs/finalize",
        entityType: "flooringWorkOrder",
        entityId: workOrderId,
      },
      () =>
        finalizeWorkOrderCutLogBatchUseCase({
          workOrderId,
          requestKey: input.requestKey,
          cutLogIds: input.cutLogIds,
          requestedBy,
        }),
    )

    const responseBody = { batch: result }
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
