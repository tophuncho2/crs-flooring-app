import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { listInventoryAllocationOptionsUseCase } from "@/features/flooring/work-orders/application/allocations"
import { buildInventoryAllocationOptionsResponse } from "@/features/flooring/work-orders/transport/allocations"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  try {
    const { id, itemId } = await params
    const options = await listInventoryAllocationOptionsUseCase(id, itemId)
    return routeJson(access, buildInventoryAllocationOptionsResponse(options))
  } catch (error) {
    return routeError(access, error)
  }
}
