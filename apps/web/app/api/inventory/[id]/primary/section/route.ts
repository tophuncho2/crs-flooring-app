import { getInventoryById } from "@builders/db"
import { updateInventoryUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateUpdateInventoryInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "inventory.primary.section.replace",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateInventoryInput, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getInventoryById(id)
    if (!currentSnapshot) {
      return routeError(access, new Error("Inventory row not found"))
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { inventory: currentSnapshot },
      message: "Inventory row changed before save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "inventory.primary.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Inventory primary section updated",
        action: "inventory.primary.section.replace",
        route: "/api/inventory/[id]/primary/section",
        entityType: "flooringInventory",
        entityId: id,
      },
      () => updateInventoryUseCase(id, input),
    )

    const responseBody = { inventory: result }
    await finalizeMutationReceipt({
      scope: "inventory.primary.section.replace",
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
