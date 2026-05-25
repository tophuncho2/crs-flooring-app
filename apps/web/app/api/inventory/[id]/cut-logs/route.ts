import { listInventoryCutLogsUseCase } from "@builders/application"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"
import { validateCutLogsPageQuery } from "@/app/api/cut-logs/_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/inventory/[id]/cut-logs
 *
 * Paginated read of cut logs on a single inventory record. Powers the
 * inventory record view's cut-log section. Returns
 * `{ page: InventoryCutLogPage }`.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/inventory/[id]/cut-logs",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const inventoryId = parseUuidParam(rawId, "id")
    const url = new URL(request.url)
    const { page, pageSize } = validateCutLogsPageQuery(url.searchParams)
    const result = await listInventoryCutLogsUseCase({
      inventoryId,
      page,
      pageSize,
    })
    return routeJson(access, { page: result })
  } catch (error) {
    return routeError(access, error)
  }
}
