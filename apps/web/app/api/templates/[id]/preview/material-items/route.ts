import { listTemplatePreviewMaterialItemsUseCase } from "@builders/application"
import { TEMPLATES_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { validateTemplatePreviewMaterialItemsQuery } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: TEMPLATES_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/templates/[id]/preview/material-items",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const url = new URL(request.url)
    const { page, pageSize } = validateTemplatePreviewMaterialItemsQuery(url.searchParams)
    const result = await listTemplatePreviewMaterialItemsUseCase({
      templateId: id,
      page,
      pageSize,
    })
    return routeJson(access, { page: result })
  } catch (error) {
    return routeError(access, error)
  }
}
