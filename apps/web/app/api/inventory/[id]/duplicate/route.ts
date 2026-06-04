import { getInventoryDetailById } from "@builders/db"
import { duplicateInventoryUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateDuplicateInventoryInput } from "../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/inventory/[id]/duplicate — clone the source inventory row (`id`)
 * into a brand-new row. Synchronous create (no worker / outbox). The body
 * carries the five editable fields; everything else is pasted from the source
 * server-side. No expected-updated-at check — the source is read-only — but
 * the mutation receipt still guards against double-creation on retry.
 */
export async function POST(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "inventory.duplicate",
      route: "/api/inventory/[id]/duplicate",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateDuplicateInventoryInput, {
      requireExpectedUpdatedAt: false,
    })

    const receipt = await enforceMutationReceipt({
      scope: "inventory.duplicate",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Inventory item duplicated",
        action: "inventory.duplicate",
        route: "/api/inventory/[id]/duplicate",
        entityType: "flooringInventory",
        entityId: id,
      },
      () => duplicateInventoryUseCase(id, input),
    )

    // Return the full detail (row + adjustments) so the hub can re-seed its view on
    // the brand-new row. A fresh duplicate always has zero adjustments.
    const detail = (await getInventoryDetailById(result.id)) ?? result
    const responseBody = { inventory: detail }
    await finalizeMutationReceipt({
      scope: "inventory.duplicate",
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
