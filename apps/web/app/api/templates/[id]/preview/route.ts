import { getTemplatePreviewUseCase } from "@builders/application"
import { TEMPLATES_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { validateTemplatePreviewQuery } from "../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: TEMPLATES_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/templates/[id]/preview")
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const url = new URL(request.url)
    const { itemsPage, itemsPageSize } = validateTemplatePreviewQuery(url.searchParams)
    const preview = await getTemplatePreviewUseCase({
      templateId: id,
      itemsPage,
      itemsPageSize,
    })
    return routeJson(access, { preview })
  } catch (error) {
    return routeError(access, error)
  }
}
