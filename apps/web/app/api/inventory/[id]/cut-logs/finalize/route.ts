import { markCutLogsForFinalizeUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateMarkCutLogsForFinalizeBody } from "../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/inventory/[id]/cut-logs/finalize
 *
 * Producer route for the finalize flow. User selects a batch of pending
 * cut logs in the section UI (clean slate required) and clicks
 * Finalize. The route shapes the body via
 * `validateMarkCutLogsForFinalizeBody`, calls
 * `markCutLogsForFinalizeUseCase` (sweep 4), which validates the batch,
 * flips selected rows PENDING → QUEUED via `markCutLogsForFinalize`
 * (sweep 3), and writes a `finalize-cut-log-batch` outbox event. The
 * worker stamps `before` / `after` / `finalCutSequence` /
 * `status=FINAL` / `isFinal=true` per row.
 *
 * Returns 202 Accepted. Mirrors `mark-for-import/route.ts` exactly.
 */
export async function POST(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "inventory.cut-logs.finalize",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]/cut-logs/finalize",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(
      body,
      validateMarkCutLogsForFinalizeBody,
    )

    const receipt = await enforceMutationReceipt({
      scope: "inventory.cut-logs.finalize",
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
        message: "Cut logs marked for finalize",
        action: "inventory.cut-logs.finalize",
        route: "/api/inventory/[id]/cut-logs/finalize",
        entityType: "flooringInventory",
        entityId: id,
      },
      () =>
        markCutLogsForFinalizeUseCase({
          inventoryId: id,
          cutLogIds: input.cutLogIds,
          requestedBy,
        }),
    )

    const responseBody = { batch: result }
    await finalizeMutationReceipt({
      scope: "inventory.cut-logs.finalize",
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
