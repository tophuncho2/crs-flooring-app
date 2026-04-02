import { authorizeWorkOrdersRoute } from "@/modules/shared/access/templates-work-orders"
import { listInventoryAllocationOptionsForProductUseCase } from "@/modules/work-orders/application/allocations"
import { buildInventoryAllocationOptionsResponse } from "@/modules/work-orders/transport/allocations"
import { parseRequiredString, parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { enforceQueryRateLimit } from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request, { capability: "workOrders.read" })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/work-orders/[id]/allocation-options")
  if (rateLimited) return rateLimited

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
