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
import { validateFinalizeAdjustmentInput } from "@/app/api/adjustments/_validators"

type RouteContext = {
  params: Promise<{ id: string; adjustmentId: string }>
}

/**
 * POST /api/inventory/[id]/adjustments/[adjustmentId]/finalize
 *
 * Synchronous single-row finalize under the inventory scope. Calls
 * `finalizeAdjustmentUseCase` with
 * `{ scope: { kind: "inventory", inventoryId } }`. The use case
 * scope-asserts row → inventory membership, locks the parent inventory
 * FOR UPDATE, runs the finalizability gate, stamps `before` / `after` /
 * `finalCutSequence`, flips status to FINAL, and re-snaps `location`
 * via `applyFinalizeAdjustment`. Returns 200 with the stamped adjustment.
 *
 * Resource-level URL (per [adjustmentId]) — inv-side normalizes against the
 * WO-side's legacy collection-level `/finalize` URL. Cross-side
 * asymmetry is accepted (see docs/adjustments-application-sweep.md).
 */
export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "inventory.adjustments.finalize",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]/adjustments/[adjustmentId]/finalize",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, adjustmentId: rawAdjustmentId } = await params
    const inventoryId = parseUuidParam(rawId, "id")
    const adjustmentId = parseUuidParam(rawAdjustmentId, "adjustmentId")

    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(
      body,
      validateFinalizeAdjustmentInput,
    )

    const receipt = await enforceMutationReceipt({
      scope: "inventory.adjustments.finalize",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Adjustment finalized (inv-side)",
        action: "inventory.adjustments.finalize",
        route: "/api/inventory/[id]/adjustments/[adjustmentId]/finalize",
        entityType: "flooringAdjustment",
        entityId: adjustmentId,
      },
      () =>
        finalizeAdjustmentUseCase({
          scope: { kind: "inventory", inventoryId },
          adjustmentId: adjustmentId,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "inventory.adjustments.finalize",
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
