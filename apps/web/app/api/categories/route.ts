import { listCategories } from "@builders/db"
import { CATEGORIES_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: CATEGORIES_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/categories")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, { categories: await listCategories() })
  } catch (error) {
    return routeError(access, error)
  }
}
