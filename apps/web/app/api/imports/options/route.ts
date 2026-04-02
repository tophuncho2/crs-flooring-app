import { getImportFormOptions } from "@/modules/imports/data/queries"
import { authorizeWarehouseRoute } from "@/modules/shared/access/domain-tools"
import { enforceQueryRateLimit } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/imports/options")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, await getImportFormOptions())
  } catch (error) {
    return routeError(access, error)
  }
}
