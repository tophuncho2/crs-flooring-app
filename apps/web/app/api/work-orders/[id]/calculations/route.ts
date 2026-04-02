import { authorizeWorkOrdersRoute } from "@/modules/shared/access/templates-work-orders"
import { listWorkOrderCalculationRows } from "@/modules/work-orders/queries"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { enforceQueryRateLimit } from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/work-orders/[id]/calculations")
  if (rateLimited) return rateLimited

  try {
    const { id } = await params
    return routeJson(access, { items: await listWorkOrderCalculationRows(id) })
  } catch (error) {
    return routeError(access, error)
  }
}
