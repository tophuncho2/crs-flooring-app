import {
  deletePendingAdjustmentUseCase,
  updatePendingAdjustmentUseCase,
} from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import {
  validateDeletePendingCutLogInput,
  validateUpdatePendingCutLogInput,
} from "@/app/api/cut-logs/_validators"

type RouteContext = {
  params: Promise<{ id: string; cutLogId: string }>
}

/**
 * PATCH /api/work-orders/[id]/cut-logs/[cutLogId]
 *
 * Synchronous update for a single pending cut log. Calls
 * `updatePendingAdjustmentUseCase`, which opens its own TX, asserts WOMI
 * ownership + IDLE status, asserts the row is still PENDING (final
 * cuts cannot be edited via this path), enforces optimistic
 * concurrency against `mutation.expectedUpdatedAt`, locks the parent
 * inventory FOR UPDATE, applies the patch, re-derives `coverageCut`
 * if `cut` changed, recomputes `totalCutSum`, and asserts the
 * invariant. Returns 200 with the updated row.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "work-orders.cut-logs.pending.update",
      limit: 1200,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/cut-logs/[cutLogId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, cutLogId: rawCutLogId } = await params
    const workOrderId = parseUuidParam(rawId, "id")
    const cutLogId = parseUuidParam(rawCutLogId, "cutLogId")

    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(
      body,
      validateUpdatePendingCutLogInput,
      { requireExpectedUpdatedAt: true },
    )

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.cut-logs.pending.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Pending cut log updated",
        action: "work-orders.cut-logs.pending.update",
        route: "/api/work-orders/[id]/cut-logs/[cutLogId]",
        entityType: "flooringCutLog",
        entityId: cutLogId,
      },
      () =>
        updatePendingAdjustmentUseCase({
          scope: { kind: "work-order", workOrderId },
          adjustmentId: cutLogId,
          expectedUpdatedAt: mutation.expectedUpdatedAt!,
          patch: input.patch,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "work-orders.cut-logs.pending.update",
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

/**
 * DELETE /api/work-orders/[id]/cut-logs/[cutLogId]
 *
 * Synchronous delete for a single pending cut log. Calls
 * `deletePendingAdjustmentUseCase`, which asserts WOMI ownership + IDLE
 * status, asserts the row is PENDING (final cuts cannot be deleted —
 * void them at /void instead), enforces OCC, locks the parent
 * inventory FOR UPDATE, deletes the row, and recomputes
 * `totalCutSum`. Returns 200.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "work-orders.cut-logs.pending.delete",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/cut-logs/[cutLogId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, cutLogId: rawCutLogId } = await params
    const workOrderId = parseUuidParam(rawId, "id")
    const cutLogId = parseUuidParam(rawCutLogId, "cutLogId")

    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(
      body,
      validateDeletePendingCutLogInput,
      { requireExpectedUpdatedAt: true },
    )

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.cut-logs.pending.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Pending cut log deleted",
        action: "work-orders.cut-logs.pending.delete",
        route: "/api/work-orders/[id]/cut-logs/[cutLogId]",
        entityType: "flooringCutLog",
        entityId: cutLogId,
      },
      () =>
        deletePendingAdjustmentUseCase({
          scope: { kind: "work-order", workOrderId },
          adjustmentId: cutLogId,
          expectedUpdatedAt: mutation.expectedUpdatedAt!,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "work-orders.cut-logs.pending.delete",
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
