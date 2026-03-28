import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { listInventoryAllocationOptionsUseCase } from "@/features/flooring/work-orders/application/allocations"
import { buildInventoryAllocationOptionsResponse } from "@/features/flooring/work-orders/transport/allocations"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request, { capability: "workOrders.read" })
  if (access instanceof Response) return access

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
