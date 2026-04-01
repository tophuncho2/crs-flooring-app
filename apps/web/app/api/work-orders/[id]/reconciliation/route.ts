import { authorizeWorkOrdersRoute } from "@/modules/shared/access/templates-work-orders"
import { getWorkOrderReconciliationById } from "@/modules/work-orders/queries"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request, { capability: "workOrders.read" })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const reconciliation = await getWorkOrderReconciliationById(id)
    return routeJson(access, { workOrder: reconciliation })
  } catch (error) {
    return routeError(access, error)
  }
}
