import {
  deletePendingCutLogUseCase,
  updatePendingCutLogUseCase,
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
  validateInvDeletePendingCutLogInput,
  validateInvUpdatePendingCutLogInput,
} from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string; cutLogId: string }>
}

/**
 * PATCH /api/inventory/[id]/cut-logs/[cutLogId]
 *
 * Synchronous update for a single pending cut log under the inventory
 * scope. Calls `updatePendingCutLogUseCase` with
 * `{ scope: { kind: "inventory", inventoryId } }`. The use case loads
 * the row, asserts scope membership, runs the PENDING + OCC gates,
 * applies any link patch (with WOMI re-link validity check), locks the
 * parent inventory FOR UPDATE, applies the patch (always re-snapping
 * `location` from the parent), recomputes `totalCutSum`, and asserts
 * the invariant. Returns 200 with the updated row.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "inventory.cut-logs.pending.update",
      limit: 1200,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]/cut-logs/[cutLogId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, cutLogId: rawCutLogId } = await params
    const inventoryId = parseUuidParam(rawId, "id")
    const cutLogId = parseUuidParam(rawCutLogId, "cutLogId")

    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(
      body,
      validateInvUpdatePendingCutLogInput,
      { requireExpectedUpdatedAt: true },
    )

    const receipt = await enforceMutationReceipt({
      scope: "inventory.cut-logs.pending.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Pending cut log updated (inv-side)",
        action: "inventory.cut-logs.pending.update",
        route: "/api/inventory/[id]/cut-logs/[cutLogId]",
        entityType: "flooringCutLog",
        entityId: cutLogId,
      },
      () =>
        updatePendingCutLogUseCase({
          scope: { kind: "inventory", inventoryId },
          cutLogId,
          expectedUpdatedAt: mutation.expectedUpdatedAt!,
          patch: input.patch,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "inventory.cut-logs.pending.update",
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
 * DELETE /api/inventory/[id]/cut-logs/[cutLogId]
 *
 * Synchronous delete for a single pending cut log under the inventory
 * scope. Same gates as the WO-side delete (PENDING-only + OCC); final
 * cuts are voided via /void instead. Returns 200 with the parent
 * inventory's recomputed `totalCutSum`.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "inventory.cut-logs.pending.delete",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]/cut-logs/[cutLogId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, cutLogId: rawCutLogId } = await params
    const inventoryId = parseUuidParam(rawId, "id")
    const cutLogId = parseUuidParam(rawCutLogId, "cutLogId")

    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(
      body,
      validateInvDeletePendingCutLogInput,
      { requireExpectedUpdatedAt: true },
    )

    const receipt = await enforceMutationReceipt({
      scope: "inventory.cut-logs.pending.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Pending cut log deleted (inv-side)",
        action: "inventory.cut-logs.pending.delete",
        route: "/api/inventory/[id]/cut-logs/[cutLogId]",
        entityType: "flooringCutLog",
        entityId: cutLogId,
      },
      () =>
        deletePendingCutLogUseCase({
          scope: { kind: "inventory", inventoryId },
          cutLogId,
          expectedUpdatedAt: mutation.expectedUpdatedAt!,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "inventory.cut-logs.pending.delete",
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
