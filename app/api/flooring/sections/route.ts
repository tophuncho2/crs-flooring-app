import { prisma } from "@/server/db/prisma"
import { createSectionRow, listSectionRows, parseWarehouseFilter } from "@/features/flooring/warehouse/api"
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
    return routeJson(access, { sections: await listSectionRows(prisma, parseWarehouseFilter(searchParams.get("warehouseId"))) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "warehouse.sections.write",
    limit: 40,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/sections",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const section = await createSectionRow(prisma, (await request.json()) as Record<string, unknown>)
    logRouteMutationSuccess(access, {
      message: "Warehouse section created",
      action: "warehouse.sections.create",
      route: "/api/flooring/sections",
      entityType: "flooringSection",
      entityId: section.id,
      details: {
        warehouseId: section.warehouseId,
      },
    })

    return routeJson(access, { section }, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Warehouse section creation failed",
        action: "warehouse.sections.create.error",
        route: "/api/flooring/sections",
        entityType: "flooringSection",
      },
      error,
    )
    return routeError(access, error)
  }
}
