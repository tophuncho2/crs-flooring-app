import { getProductFormOptions } from "@/modules/products/data/queries"
import { applyRoutePolicy } from "@/server/http/route-policy"
import {
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: "products",
    rateLimit: {
      scope: "query",
      limit: 100,
      windowMs: 60 * 1000,
      route: "/api/products/options",
    },
  })
  if (access instanceof Response) return access

  try {
    return routeJson(access, await getProductFormOptions())
  } catch (error) {
    return routeError(access, error)
  }
}
