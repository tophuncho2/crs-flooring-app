import { saveWorkOrderItemPendingCutLogDiffUseCase } from "@builders/application"
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
import { validateWorkOrderItemPendingCutLogDiffInput } from "../../../../../_validators"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

/**
 * PATCH /api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/section
 *
 * Producer route for the WO-side pending-cut-log diff. Calls
 * `saveWorkOrderItemPendingCutLogDiffUseCase`, which marks the WOMI
 * `IDLE → SAVING_CUTS`, stamps draft UUIDs, asserts linkage symmetry,
 * and writes a `flooring.work-order-item.pending-cut-log.save` outbox
 * event. The relay drains the outbox to BullMQ; the worker locks all
 * touched inventories (deterministic FOR UPDATE on the sorted ID set)
 * and applies the diff.
 *
 * Returns 202 Accepted because the actual cut-log writes happen in the
 * worker. Mirrors the inventory-side cut-logs/section/route.ts pattern.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: WORK_ORDERS_TOOL_SLUG,
    rateLimit: {
      scope: "work-orders.material-items.pending-cut-logs.section.replace",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, itemId: rawItemId } = await params
    const workOrderId = parseUuidParam(rawId, "id")
    const workOrderItemId = parseUuidParam(rawItemId, "itemId")

    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(
      body,
      validateWorkOrderItemPendingCutLogDiffInput,
    )

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.material-items.pending-cut-logs.section.replace",
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
        message: "Work-order pending cut-log diff queued",
        action: "work-orders.material-items.pending-cut-logs.section.replace",
        route: "/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/section",
        entityType: "flooringWorkOrderItem",
        entityId: workOrderItemId,
      },
      () =>
        saveWorkOrderItemPendingCutLogDiffUseCase({
          workOrderId,
          workOrderItemId,
          requestKey: input.requestKey,
          diff: input.diff,
          requestedBy,
        }),
    )

    const responseBody = { batch: result }
    await finalizeMutationReceipt({
      scope: "work-orders.material-items.pending-cut-logs.section.replace",
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
