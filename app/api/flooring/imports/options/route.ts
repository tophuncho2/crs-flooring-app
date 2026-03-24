import { getImportFormOptions } from "@/features/flooring/imports/data/queries"
import { authorizeWarehouseRoute } from "@/features/flooring/shared/access/domain-tools"
import { routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  try {
    return routeJson(access, await getImportFormOptions())
  } catch (error) {
    return routeError(access, error)
  }
}
