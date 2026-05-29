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
  validateDeletePendingAdjustmentInput,
  validateUpdatePendingAdjustmentInput,
} from "@/app/api/adjustments/_validators"

type RouteContext = {
  params: Promise<{ id: string; adjustmentId: string }>
}

/**
 * PATCH /api/work-orders/[id]/adjustments/[adjustmentId]
 *
 * Synchronous update for a single pending adjustment. Calls
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
      scope: "work-orders.adjustments.pending.update",
      limit: 1200,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/adjustments/[adjustmentId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, adjustmentId: rawAdjustmentId } = await params
    const workOrderId = parseUuidParam(rawId, "id")
    const adjustmentId = parseUuidParam(rawAdjustmentId, "adjustmentId")

    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(
      body,
      validateUpdatePendingAdjustmentInput,
      { requireExpectedUpdatedAt: true },
    )

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.adjustments.pending.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Pending adjustment updated",
        action: "work-orders.adjustments.pending.update",
        route: "/api/work-orders/[id]/adjustments/[adjustmentId]",
        entityType: "flooringAdjustment",
        entityId: adjustmentId,
      },
      () =>
        updatePendingAdjustmentUseCase({
          scope: { kind: "work-order", workOrderId },
          adjustmentId: adjustmentId,
          expectedUpdatedAt: mutation.expectedUpdatedAt!,
          patch: input.patch,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "work-orders.adjustments.pending.update",
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
 * DELETE /api/work-orders/[id]/adjustments/[adjustmentId]
 *
 * Synchronous delete for a single pending adjustment. Calls
 * `deletePendingAdjustmentUseCase`, which asserts WOMI ownership + IDLE
 * status, asserts the row is PENDING (final cuts cannot be deleted —
 * void them at /void instead), enforces OCC, locks the parent
 * inventory FOR UPDATE, deletes the row, and recomputes
 * `totalCutSum`. Returns 200.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "work-orders.adjustments.pending.delete",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/adjustments/[adjustmentId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, adjustmentId: rawAdjustmentId } = await params
    const workOrderId = parseUuidParam(rawId, "id")
    const adjustmentId = parseUuidParam(rawAdjustmentId, "adjustmentId")

    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(
      body,
      validateDeletePendingAdjustmentInput,
      { requireExpectedUpdatedAt: true },
    )

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.adjustments.pending.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Pending adjustment deleted",
        action: "work-orders.adjustments.pending.delete",
        route: "/api/work-orders/[id]/adjustments/[adjustmentId]",
        entityType: "flooringAdjustment",
        entityId: adjustmentId,
      },
      () =>
        deletePendingAdjustmentUseCase({
          scope: { kind: "work-order", workOrderId },
          adjustmentId: adjustmentId,
          expectedUpdatedAt: mutation.expectedUpdatedAt!,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "work-orders.adjustments.pending.delete",
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
