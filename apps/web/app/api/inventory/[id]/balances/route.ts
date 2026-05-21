import { getInventoryBalancesById } from "@builders/db"
import { InventoryExecutionError } from "@builders/application"
import { authorizeWarehouseRoute } from "@/modules/shared/access/domain-tools"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { enforceQueryRateLimit } from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/inventory/[id]/balances
 *
 * Returns just the three derived cells on the inventory primary section that
 * change in response to cut-log mutations. Used by the inventory record view
 * to reconcile after a cut-log mutation without refetching the full detail
 * row. Returns `{ balances: { stockBalance, totalCutSum, coverageBalance } }`.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/inventory/[id]/balances",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const inventoryId = parseUuidParam(rawId, "id")
    const balances = await getInventoryBalancesById(inventoryId)
    if (!balances) {
      throw new InventoryExecutionError({
        code: "INVENTORY_NOT_FOUND",
        message: "Inventory row not found.",
        status: 404,
      })
    }
    return routeJson(access, { balances })
  } catch (error) {
    return routeError(access, error)
  }
}
