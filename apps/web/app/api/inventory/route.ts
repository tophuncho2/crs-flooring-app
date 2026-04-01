import { createInventoryRow, listInventoryRows } from "@/modules/inventory/api"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  requireRouteAccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")?.trim() ?? ""
    return routeJson(access, { inventory: await listInventoryRows(undefined, productId || undefined) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "inventory.write",
    limit: 60,
    windowMs: 10 * 60 * 1000,
    route: "/api/inventory",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await request.json()) as Record<string, unknown>
    const inventory = await createInventoryRow(undefined, body)
    logRouteMutationSuccess(access, {
      message: "Inventory created",
      action: "inventory.create",
      route: "/api/inventory",
      entityType: "flooringInventory",
      entityId: inventory.id,
      details: {
        productId: inventory.productId,
        locationId: inventory.locationId,
      },
    })

    return routeJson(access, { inventory }, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Inventory creation failed",
        action: "inventory.create.error",
        route: "/api/inventory",
        entityType: "flooringInventory",
      },
      error,
    )
    return routeError(access, error)
  }
}
