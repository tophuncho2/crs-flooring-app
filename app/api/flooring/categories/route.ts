import { flooringCategoryUnitInclude, normalizeCategoryUnitValues } from "@/server/flooring/unit-measures"
import { prisma } from "@/server/db/prisma"
import { parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { authorizeCategoriesRoute } from "@/features/flooring/shared/access/lookup-domains"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

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

export async function GET(request: Request) {
  const access = await authorizeCategoriesRoute(request)
  if (access instanceof Response) return access

  try {
    const categories = await prisma.flooringCategory.findMany({
      include: {
        ...flooringCategoryUnitInclude,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    })

    return routeJson(access, { categories: categories.map(normalizeCategory) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizeCategoriesRoute(request, { capability: "governance.access" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "categories.write",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/categories",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await request.json()) as Record<string, unknown>
    const category = await prisma.flooringCategory.create({
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

    return routeJson(access, { category: normalizeCategory(category) }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
