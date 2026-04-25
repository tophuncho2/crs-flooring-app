import { getInventoryById, getInventoryDetailById } from "@builders/db"
import { InventoryExecutionError, deleteInventoryUseCase } from "@builders/application"
import { authorizeWarehouseRoute } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/inventory/[id]")
  if (rateLimited) return rateLimited

  try {
    const { id } = await context.params
    return routeJson(access, { inventory: await getInventoryDetailById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "inventory.delete",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { mutation } = parseMutationEnvelope(body, (inputBody) => inputBody, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getInventoryById(id)
    if (!currentSnapshot) {
      throw new InventoryExecutionError({
        code: "INVENTORY_NOT_FOUND",
        message: "Inventory row not found.",
        status: 404,
      })
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { inventory: currentSnapshot },
      message: "Inventory row changed before save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "inventory.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Inventory row deleted",
        action: "inventory.delete",
        route: "/api/inventory/[id]",
        entityType: "flooringInventory",
        entityId: id,
      },
      () => deleteInventoryUseCase(id),
    )

    const responseBody = { ok: true }
    await finalizeMutationReceipt({
      scope: "inventory.delete",
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
