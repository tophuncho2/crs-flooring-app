import { searchManufacturerOptionsUseCase } from "@builders/application"
import { MANUFACTURERS_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { validateManufacturerOptionsQuery } from "../_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: MANUFACTURERS_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/manufacturers/options",
  )
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateManufacturerOptionsQuery(url.searchParams)
    const options = await searchManufacturerOptionsUseCase(input)
    return routeJson(access, { options })
  } catch (error) {
    return routeError(access, error)
  }
}
