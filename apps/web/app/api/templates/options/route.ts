import { searchTemplateOptionsUseCase } from "@builders/application"
import { TEMPLATES_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { validateTemplateOptionsQuery } from "../_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: TEMPLATES_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/templates/options")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateTemplateOptionsQuery(url.searchParams)
    const result = await searchTemplateOptionsUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
