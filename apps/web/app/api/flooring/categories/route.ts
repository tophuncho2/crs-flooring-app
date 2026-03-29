import { createCategoryRecord, validateUpdateCategoryPrimarySectionInput } from "@/features/flooring/categories/application/manage-category"
import { listCategories } from "@/features/flooring/categories/data/queries"
import { authorizeCategoriesRoute } from "@/features/flooring/shared/access/lookup-domains"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeCategoriesRoute(request)
  if (access instanceof Response) return access

  try {
    return routeJson(access, { categories: await listCategories() })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizeCategoriesRoute(request, { capability: "categories.edit" })
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
    const category = await createCategoryRecord(validateUpdateCategoryPrimarySectionInput(body))
    logRouteMutationSuccess(access, {
      message: "Category created",
      action: "categories.create",
      route: "/api/flooring/categories",
      entityType: "flooringCategory",
      entityId: category.id,
    })

    return routeJson(access, { category }, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Category creation failed",
        action: "categories.create.error",
        route: "/api/flooring/categories",
        entityType: "flooringCategory",
      },
      error,
    )
    return routeError(access, error)
  }
}
