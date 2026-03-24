import { getProductFormOptions } from "@/features/flooring/products/data/queries"
import {
  requireRouteAccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "products" })
  if (access instanceof Response) return access

  try {
    return routeJson(access, await getProductFormOptions())
  } catch (error) {
    return routeError(access, error)
  }
}
