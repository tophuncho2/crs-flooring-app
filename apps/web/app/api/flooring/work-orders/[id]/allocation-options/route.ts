import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { listInventoryAllocationOptionsForProductUseCase } from "@/features/flooring/work-orders/application/allocations"
import { buildInventoryAllocationOptionsResponse } from "@/features/flooring/work-orders/transport/allocations"
import { parseRequiredString, parseUuidParam } from "@/server/http/api-helpers"
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
    const searchParams = new URL(request.url).searchParams
    const productId = parseUuidParam(parseRequiredString(searchParams.get("productId"), "productId"), "productId")
    const options = await listInventoryAllocationOptionsForProductUseCase(id, productId)
    return routeJson(access, buildInventoryAllocationOptionsResponse(options))
  } catch (error) {
    return routeError(access, error)
  }
}
