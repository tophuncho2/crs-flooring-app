import { authorizeTemplatesRoute } from "@/modules/shared/access/templates-work-orders"
import { listTemplateCalculationRows } from "@/modules/templates/queries"
import { enforceQueryRateLimit } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/templates/[id]/calculations")
  if (rateLimited) return rateLimited

  try {
    const { id } = await params
    return routeJson(access, { items: await listTemplateCalculationRows(id) })
  } catch (error) {
    return routeError(access, error)
  }
}
