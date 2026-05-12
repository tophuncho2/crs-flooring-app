import { voidCutLogUseCase } from "@builders/application"
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
import { validateInvVoidCutLogInput } from "../../../../_validators"

type RouteContext = {
  params: Promise<{ id: string; cutLogId: string }>
}

/**
 * POST /api/inventory/[id]/cut-logs/[cutLogId]/void
 *
 * Synchronous void under the inventory scope. Calls `voidCutLogUseCase`
 * with `{ scope: { kind: "inventory", inventoryId } }`. The use case
 * scope-asserts the row belongs to this inventory, locks the parent
 * inventory FOR UPDATE, runs `canVoidCutLog` (allowed on PENDING or
 * FINAL; QUEUED/already-VOID rejected), applies the canonical void
 * patch (zeros `cut`, clears link cols, clears `location`), and
 * recomputes `totalCutSum`. Returns 200 with the voided row.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: WORK_ORDERS_TOOL_SLUG,
    rateLimit: {
      scope: "inventory.cut-logs.void",
      limit: 300,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]/cut-logs/[cutLogId]/void",
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
      validateInvVoidCutLogInput,
    )

    const receipt = await enforceMutationReceipt({
      scope: "inventory.cut-logs.void",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Cut log voided (inv-side)",
        action: "inventory.cut-logs.void",
        route: "/api/inventory/[id]/cut-logs/[cutLogId]/void",
        entityType: "flooringCutLog",
        entityId: cutLogId,
      },
      () =>
        voidCutLogUseCase({
          scope: { kind: "inventory", inventoryId },
          cutLogId,
        }),
    )

    const responseBody = result
    await finalizeMutationReceipt({
      scope: "inventory.cut-logs.void",
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
