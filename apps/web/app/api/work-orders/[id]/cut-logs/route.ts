import { createPendingCutLogUseCase } from "@builders/application"
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
import { validateCreatePendingCutLogInput } from "../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/work-orders/[id]/cut-logs
 *
 * Synchronous create for a single pending cut log under one WOMI.
 * Calls `createPendingCutLogUseCase`, which opens its own TX, asserts
 * WOMI ownership + IDLE status, takes the parent inventory FOR UPDATE
 * lock, stamps the four unit-snapshot fields from the inventory,
 * inserts the row, recomputes `totalCutSum`, and asserts the
 * `<= startingStock` invariant. Returns 200 with the inserted row.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: WORK_ORDERS_TOOL_SLUG,
    rateLimit: {
      scope: "work-orders.cut-logs.pending.create",
      limit: 120,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/cut-logs",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const workOrderId = parseUuidParam(rawId, "id")

    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreatePendingCutLogInput)

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.cut-logs.pending.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Pending cut log created",
        action: "work-orders.cut-logs.pending.create",
        route: "/api/work-orders/[id]/cut-logs",
        entityType: "flooringWorkOrderItem",
        entityId: input.workOrderItemId,
      },
      () =>
        createPendingCutLogUseCase({
          workOrderId,
          workOrderItemId: input.workOrderItemId,
          inventoryId: input.inventoryId,
          cut: input.cut,
          isWaste: input.isWaste,
          notes: input.notes,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "work-orders.cut-logs.pending.create",
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
