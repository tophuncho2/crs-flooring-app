import { searchWorkOrderMaterialItemOptionsUseCase } from "@builders/application"
import { WORK_ORDERS_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"
import { validateWorkOrderMaterialItemOptionsQuery } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/work-orders/[id]/material-items/options
 *
 * Async picker for the cut-log relink "Material item" dropdown. Scoped to
 * the path-derived work order and the query-derived `productId` (the cut
 * log's frozen product snapshot) so the picker only surfaces WOMIs the
 * cut log is allowed to relink to.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: WORK_ORDERS_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/work-orders/[id]/material-items/options",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const workOrderId = parseUuidParam(rawId, "id")
    const url = new URL(request.url)
    const { productId, take } = validateWorkOrderMaterialItemOptionsQuery(url.searchParams)
    const options = await searchWorkOrderMaterialItemOptionsUseCase({
      workOrderId,
      productId,
      take,
    })
    return routeJson(access, { options })
  } catch (error) {
    return routeError(access, error)
  }
}
