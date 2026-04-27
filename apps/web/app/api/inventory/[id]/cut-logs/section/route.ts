import { saveCutLogPendingDiffUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateSaveCutLogPendingDiffBody } from "../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/inventory/[id]/cut-logs/section
 *
 * Producer route for the cut-log pending-save flow. The diff (added /
 * modified / deleted entries) lives in the body; the route shapes it
 * via `validateSaveCutLogPendingDiffBody`, calls
 * `saveCutLogPendingDiffUseCase` (sweep 4), which validates the diff
 * against the in-tx snapshot, stamps tempIds → uuids via
 * `assignCutLogDiffIds`, and writes a `pending-save-cut-log-batch`
 * outbox event. The relay (sweep 5) drains the outbox to BullMQ; the
 * worker applies the diff under the per-inventory `FOR UPDATE` lock.
 *
 * No parent-level `expectedUpdatedAt` is required — per-row optimistic
 * locks live inside the diff (`modified[i].expectedUpdatedAt`,
 * `deleted[i].expectedUpdatedAt`) and the use case's diff validator
 * checks them under the lock.
 *
 * Returns 202 Accepted because the actual cut-log writes happen
 * asynchronously in the worker. Mirrors `mark-for-import/route.ts`.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "inventory.cut-logs.section.replace",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]/cut-logs/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input: diff, mutation } = parseMutationEnvelope(
      body,
      validateSaveCutLogPendingDiffBody,
    )

    const receipt = await enforceMutationReceipt({
      scope: "inventory.cut-logs.section.replace",
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
        message: "Cut-log pending diff queued",
        action: "inventory.cut-logs.section.replace",
        route: "/api/inventory/[id]/cut-logs/section",
        entityType: "flooringInventory",
        entityId: id,
      },
      () =>
        saveCutLogPendingDiffUseCase({
          inventoryId: id,
          diff,
          requestedBy,
        }),
    )

    const responseBody = { batch: result }
    await finalizeMutationReceipt({
      scope: "inventory.cut-logs.section.replace",
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
