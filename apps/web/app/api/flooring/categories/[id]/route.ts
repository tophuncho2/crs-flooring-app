import {
  deleteCategoryRecord,
  replaceCategoryPrimarySection,
  validateUpdateCategoryPrimarySectionInput,
} from "@/features/flooring/categories/application/manage-category"
import { authorizeCategoriesRoute } from "@/features/flooring/shared/access/lookup-domains"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await authorizeCategoriesRoute(request, { capability: "categories.edit" })
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
    const category = await replaceCategoryPrimarySection(id, validateUpdateCategoryPrimarySectionInput(body))
    logRouteMutationSuccess(access, {
      message: "Category updated",
      action: "categories.update",
      route: "/api/flooring/categories/[id]",
      entityType: "flooringCategory",
      entityId: id,
    })

    return routeJson(access, { category })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Category update failed",
        action: "categories.update.error",
        route: "/api/flooring/categories/[id]",
        entityType: "flooringCategory",
        entityId: (await context.params).id,
      },
      error,
    )
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await authorizeCategoriesRoute(request, { capability: "categories.edit" })
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
    const result = await deleteCategoryRecord(id)
    logRouteMutationSuccess(access, {
      message: "Category deleted",
      action: "categories.delete",
      route: "/api/flooring/categories/[id]",
      entityType: "flooringCategory",
      entityId: id,
    })
    return routeJson(access, result)
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Category deletion failed",
        action: "categories.delete.error",
        route: "/api/flooring/categories/[id]",
        entityType: "flooringCategory",
        entityId: (await context.params).id,
      },
      error,
    )
    return routeError(access, error)
  }
}
