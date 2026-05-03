import { voidWorkOrderCutLogUseCase } from "@builders/application"
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

type RouteContext = {
  params: Promise<{ id: string; cutLogId: string }>
}

/**
 * POST /api/work-orders/[id]/cut-logs/[cutLogId]/void
 *
 * Synchronous void use case (no worker, no outbox). Calls
 * `voidWorkOrderCutLogUseCase`, which locks the parent inventory FOR
 * UPDATE, asserts `canVoidCutLog`, applies `buildVoidedCutLogPatch`,
 * and recomputes the inventory's totalCutSum. Returns 200 OK with the
 * voided row identifier.
 *
 * Per locked decision #1, void does NOT flip the parent WOMI's status.
 *
 * Voiding is the only mutation allowed against a finalized cut log.
 * Pending cut logs are deleted via DELETE /[cutLogId], not voided.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: WORK_ORDERS_TOOL_SLUG,
    rateLimit: {
      scope: "work-orders.cut-logs.void",
      limit: 300,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/cut-logs/[cutLogId]/void",
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
      scope: "work-orders.cut-logs.void",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Work-order cut log voided",
        action: "work-orders.cut-logs.void",
        route: "/api/work-orders/[id]/cut-logs/[cutLogId]/void",
        entityType: "flooringCutLog",
        entityId: cutLogId,
      },
      () => voidWorkOrderCutLogUseCase({ workOrderId, cutLogId }),
    )

    const responseBody = { cutLog: result }
    await finalizeMutationReceipt({
      scope: "work-orders.cut-logs.void",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
