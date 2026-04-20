import { getProductFormOptions } from "@builders/db"
import { PRODUCTS_TOOL_SLUG } from "@/modules/shared/access/tool-slugs"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: PRODUCTS_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/products/options")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, await getProductFormOptions())
  } catch (error) {
    return routeError(access, error)
  }
}
