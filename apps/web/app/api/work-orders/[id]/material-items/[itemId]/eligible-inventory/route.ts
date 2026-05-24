import { listEligibleInventoryForWorkOrderItem } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/work-orders/[id]/material-items/[itemId]/eligible-inventory",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId, itemId: rawItemId } = await params
    const workOrderId = parseUuidParam(rawId, "id")
    const workOrderItemId = parseUuidParam(rawItemId, "itemId")
    const inventories = await listEligibleInventoryForWorkOrderItem({
      workOrderId,
      workOrderItemId,
    })
    return routeJson(access, { inventories })
  } catch (error) {
    return routeError(access, error)
  }
}
