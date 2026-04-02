import { authorizeWorkOrdersRoute } from "@/modules/shared/access/templates-work-orders"
import { listInventoryAllocationOptionsUseCase } from "@/modules/work-orders/application/allocations"
import { buildInventoryAllocationOptionsResponse } from "@/modules/work-orders/transport/allocations"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { enforceQueryRateLimit } from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request, { capability: "workOrders.read" })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/work-orders/[id]/items/[itemId]/allocation-options")
  if (rateLimited) return rateLimited

  try {
    const { id: rawId, itemId: rawItemId } = await params
    const id = parseUuidParam(rawId, "id")
    const itemId = parseUuidParam(rawItemId, "itemId")
    const options = await listInventoryAllocationOptionsUseCase(id, itemId)
    return routeJson(access, buildInventoryAllocationOptionsResponse(options))
  } catch (error) {
    return routeError(access, error)
  }
}
