import { searchWarehouseOptionsUseCase } from "@builders/application"
import { WAREHOUSE_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { validateWarehouseOptionsQuery } from "../_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: WAREHOUSE_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/warehouses/options",
  )
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateWarehouseOptionsQuery(url.searchParams)
    const options = await searchWarehouseOptionsUseCase(input)
    return routeJson(access, { options })
  } catch (error) {
    return routeError(access, error)
  }
}
