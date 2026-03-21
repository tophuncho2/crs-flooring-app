import { prisma } from "@/server/db/prisma"
import { deleteInventoryRow, updateInventoryRow } from "@/features/flooring/inventory/api"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  requireRouteAccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "inventory.write",
    limit: 60,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/inventory/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const inventory = await updateInventoryRow(prisma, id, body)
    logRouteMutationSuccess(access, {
      message: "Inventory updated",
      action: "inventory.update",
      route: "/api/flooring/inventory/[id]",
      entityType: "flooringInventory",
      entityId: inventory.id,
      details: {
        productId: inventory.productId,
        locationId: inventory.locationId,
      },
    })

    return routeJson(access, { inventory })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Inventory update failed",
        action: "inventory.update.error",
        route: "/api/flooring/inventory/[id]",
        entityType: "flooringInventory",
        entityId: (await context.params).id,
      },
      error,
    )
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "inventory.delete",
    limit: 40,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/inventory/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    await deleteInventoryRow(prisma, id)
    logRouteMutationSuccess(access, {
      message: "Inventory deleted",
      action: "inventory.delete",
      route: "/api/flooring/inventory/[id]",
      entityType: "flooringInventory",
      entityId: id,
    })
    return routeJson(access, { ok: true })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Inventory deletion failed",
        action: "inventory.delete.error",
        route: "/api/flooring/inventory/[id]",
        entityType: "flooringInventory",
        entityId: (await context.params).id,
      },
      error,
    )
    return routeError(access, error)
  }
}
