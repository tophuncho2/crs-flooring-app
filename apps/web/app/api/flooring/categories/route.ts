import { createCategoryUseCase } from "@builders/application"
import { listCategories } from "@builders/db"
import { validateCategoryPrimarySectionInput } from "@/features/flooring/categories/transport/validate-category-input"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { CATEGORIES_TOOL_SLUG } from "@/features/flooring/shared/access/lookup-domains"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy } from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: CATEGORIES_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  try {
    return routeJson(access, { categories: await listCategories() })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "categories.edit",
    toolSlug: CATEGORIES_TOOL_SLUG,
    rateLimit: {
      scope: "categories.create",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/flooring/categories",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const category = await withMutationTelemetry(
      access,
      {
        message: "Category created",
        action: "categories.create",
        route: "/api/flooring/categories",
        entityType: "flooringCategory",
      },
      () => createCategoryUseCase(validateCategoryPrimarySectionInput(body)),
    )

    return routeJson(access, { category }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
