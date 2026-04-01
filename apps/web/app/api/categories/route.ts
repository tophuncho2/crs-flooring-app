import { createCategoryUseCase } from "@builders/application"
import { listCategories } from "@builders/db"
import { validateCategoryPrimarySectionInput } from "@/modules/categories/transport/validate-category-input"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { CATEGORIES_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
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
      route: "/api/categories",
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
        route: "/api/categories",
        entityType: "flooringCategory",
      },
      () => createCategoryUseCase(validateCategoryPrimarySectionInput(body)),
    )

    return routeJson(access, { category }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
