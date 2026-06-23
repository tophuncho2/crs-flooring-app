import { getAdjustmentNeighborsUseCase } from "@builders/application"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string; adjustmentId: string }>
}

/**
 * GET /api/inventory/[id]/adjustments/[adjustmentId]/neighbors
 *
 * Prev/next adjustment within this inventory's ledger (chronological
 * `createdAt DESC, id DESC` keyset, scoped to the inventory), powering the
 * record-view Adjustments-section stepper. Returns `{ neighbors }` with
 * `previousAdjustment`/`nextAdjustment` (each `{ id, adjustmentNumber }` or
 * null at the ledger ends), or 404 when the adjustment doesn't exist / doesn't
 * belong to this inventory.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/inventory/[id]/adjustments/[adjustmentId]/neighbors",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId, adjustmentId: rawAdjustmentId } = await params
    const inventoryId = parseUuidParam(rawId, "id")
    const adjustmentId = parseUuidParam(rawAdjustmentId, "adjustmentId")

    const neighbors = await getAdjustmentNeighborsUseCase({ inventoryId, adjustmentId })
    if (!neighbors) {
      return routeJson(access, { error: "Adjustment not found" }, { status: 404 })
    }
    return routeJson(access, { neighbors })
  } catch (error) {
    return routeError(access, error)
  }
}
