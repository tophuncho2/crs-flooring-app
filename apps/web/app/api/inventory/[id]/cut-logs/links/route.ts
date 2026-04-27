import { getCutLogById } from "@builders/db"
import {
  CutLogExecutionError,
  updateCutLogLinksUseCase,
} from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateUpdateCutLogLinksBody } from "../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/inventory/[id]/cut-logs/links
 *
 * Sync route for the work-order / work-order-item link flow. Per intent
 * doc, link edits do NOT go through the worker pipeline — links don't
 * touch `cut`/`coverageCut`/`cost`/`freight`/`totalCutSum`, so there's
 * no per-inventory FOR UPDATE lock to coordinate with. The use case
 * runs inside its own tx and returns the updated row directly.
 *
 * The route reads the cut log row to enforce single-row optimistic
 * lock (`expectedUpdatedAt`) BEFORE calling the use case — same pattern
 * as `inventory/[id]/primary/section/route.ts` reading the inventory
 * snapshot first. This keeps the use case's input shape free of an
 * `expectedUpdatedAt` field.
 *
 * Returns 200 OK with the updated cut log row.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "inventory.cut-logs.links.update",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]/cut-logs/links",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(
      body,
      validateUpdateCutLogLinksBody,
      { requireExpectedUpdatedAt: true },
    )

    const currentSnapshot = await getCutLogById(input.cutLogId)
    if (!currentSnapshot) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Cut log not found.",
        status: 404,
      })
    }
    if (currentSnapshot.inventoryId !== id) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Cut log does not belong to this inventory.",
        status: 404,
      })
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { cutLog: currentSnapshot },
      message:
        "Cut log changed before link update completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "inventory.cut-logs.links.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Cut log links updated",
        action: "inventory.cut-logs.links.update",
        route: "/api/inventory/[id]/cut-logs/links",
        entityType: "flooringInventory",
        entityId: id,
      },
      () =>
        updateCutLogLinksUseCase({
          cutLogId: input.cutLogId,
          workOrderId: input.workOrderId,
          workOrderItemId: input.workOrderItemId,
        }),
    )

    const responseBody = { row: result.row }
    await finalizeMutationReceipt({
      scope: "inventory.cut-logs.links.update",
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
