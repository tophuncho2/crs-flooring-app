import { flooringCategoryUnitInclude, normalizeCategoryUnitValues } from "@/server/flooring/unit-measures"
import { prisma } from "@/server/db/prisma"
import { parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { authorizeCategoriesRoute } from "@/features/flooring/shared/access/lookup-domains"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

function normalizeCategory(category: {
  id: string
  name: string
  sendUnit: { id: string; name: string } | null
  stockUnit: { id: string; name: string } | null
  coverageAvailableUnit: { id: string; name: string } | null
  itemCoverageUnit: { id: string; name: string } | null
  serviceUnit: { id: string; name: string } | null
  createdAt: Date
  _count?: { products: number }
}) {
  return {
    id: category.id,
    name: category.name,
    ...normalizeCategoryUnitValues(category),
    productCount: category._count?.products ?? 0,
    createdAt: category.createdAt.toISOString(),
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await authorizeCategoriesRoute(request, { capability: "governance.access" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "categories.write",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/categories/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const category = await prisma.flooringCategory.update({
      where: { id },
      data: {
        name: parseRequiredString(body.name, "name"),
        sendUnitId: parseOptionalString(body.sendUnitId),
        stockUnitId: parseOptionalString(body.stockUnitId),
        coverageAvailableUnitId: parseOptionalString(body.coverageAvailableUnitId),
        itemCoverageUnitId: parseOptionalString(body.itemCoverageUnitId),
        serviceUnitId: parseOptionalString(body.serviceUnitId),
      },
      include: {
        ...flooringCategoryUnitInclude,
        _count: {
          select: { products: true },
        },
      },
    })

    return routeJson(access, { category: normalizeCategory(category) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await authorizeCategoriesRoute(request, { capability: "governance.access" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "categories.delete",
    limit: 10,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/categories/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    await prisma.flooringCategory.delete({ where: { id } })
    return routeJson(access, { success: true })
  } catch (error) {
    return routeError(access, error)
  }
}
