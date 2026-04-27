import { markCutLogForVoidUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateMarkCutLogForVoidBody } from "../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/inventory/[id]/cut-logs/void
 *
 * Producer route for the void flow. Always single-row per intent doc —
 * never a batch. The route shapes the body via
 * `validateMarkCutLogForVoidBody`, calls `markCutLogForVoidUseCase`
 * (sweep 4), which validates the row's voidability, flips PENDING|FINAL
 * → QUEUED via `markCutLogForVoid` (sweep 3), and writes a
 * `void-cut-log` outbox event. The worker applies
 * `buildVoidedCutLogPatch` (cut/coverageCut/cost/freight → null/0,
 * void=true, status=VOID) and recomputes `totalCutSum`.
 *
 * Returns 202 Accepted. Same gauntlet as the finalize route.
 */
export async function POST(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "inventory.cut-logs.void",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]/cut-logs/void",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(
      body,
      validateMarkCutLogForVoidBody,
    )

    const receipt = await enforceMutationReceipt({
      scope: "inventory.cut-logs.void",
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
        message: "Cut log marked for void",
        action: "inventory.cut-logs.void",
        route: "/api/inventory/[id]/cut-logs/void",
        entityType: "flooringInventory",
        entityId: id,
      },
      () =>
        markCutLogForVoidUseCase({
          inventoryId: id,
          cutLogId: input.cutLogId,
          requestedBy,
        }),
    )

    const responseBody = { batch: result }
    await finalizeMutationReceipt({
      scope: "inventory.cut-logs.void",
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
