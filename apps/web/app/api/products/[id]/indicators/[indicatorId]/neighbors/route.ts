import { getIndicatorNeighborsUseCase } from "@builders/application"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string; indicatorId: string }>
}

/**
 * GET /api/products/[id]/indicators/[indicatorId]/neighbors
 *
 * Prev/next indicator within this product's set (keyset over `createdAt DESC,
 * id DESC`, scoped to the product), powering the record-view section stepper.
 * Returns `{ neighbors }` with `previousIndicator`/`nextIndicator` (each
 * `{ id, indicatorNumber }` or null at the ends), or 404 when the indicator
 * doesn't exist / doesn't belong to this product.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/products/[id]/indicators/[indicatorId]/neighbors",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId, indicatorId: rawIndicatorId } = await params
    const productId = parseUuidParam(rawId, "id")
    const indicatorId = parseUuidParam(rawIndicatorId, "indicatorId")

    const neighbors = await getIndicatorNeighborsUseCase({ productId, indicatorId })
    if (!neighbors) {
      return routeJson(access, { error: "Inventory indicator not found" }, { status: 404 })
    }
    return routeJson(access, { neighbors })
  } catch (error) {
    return routeError(access, error)
  }
}
