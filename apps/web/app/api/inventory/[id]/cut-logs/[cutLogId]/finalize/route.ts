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
import { validateFinalizeCutLogInput } from "@/app/api/cut-logs/_validators"

type RouteContext = {
  params: Promise<{ id: string; cutLogId: string }>
}

/**
 * POST /api/inventory/[id]/cut-logs/[cutLogId]/finalize
 *
 * Synchronous single-row finalize under the inventory scope. Calls
 * `finalizeAdjustmentUseCase` with
 * `{ scope: { kind: "inventory", inventoryId } }`. The use case
 * scope-asserts row → inventory membership, locks the parent inventory
 * FOR UPDATE, runs the finalizability gate, stamps `before` / `after` /
 * `finalCutSequence`, flips status to FINAL, and re-snaps `location`
 * via `applyFinalizeCutLog`. Returns 200 with the stamped cut log.
 *
 * Resource-level URL (per [cutLogId]) — inv-side normalizes against the
 * WO-side's legacy collection-level `/finalize` URL. Cross-side
 * asymmetry is accepted (see docs/cut-logs-application-sweep.md).
 */
export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "inventory.cut-logs.finalize",
      limit: 600,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]/cut-logs/[cutLogId]/finalize",
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
      validateFinalizeCutLogInput,
    )

    const receipt = await enforceMutationReceipt({
      scope: "inventory.cut-logs.finalize",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Cut log finalized (inv-side)",
        action: "inventory.cut-logs.finalize",
        route: "/api/inventory/[id]/cut-logs/[cutLogId]/finalize",
        entityType: "flooringCutLog",
        entityId: cutLogId,
      },
      () =>
        finalizeAdjustmentUseCase({
          scope: { kind: "inventory", inventoryId },
          adjustmentId: cutLogId,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "inventory.cut-logs.finalize",
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
