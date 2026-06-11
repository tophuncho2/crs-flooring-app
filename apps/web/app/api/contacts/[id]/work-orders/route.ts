import { listWorkOrdersForContactUseCase } from "@builders/application"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { validateWorkOrdersPageQuery } from "./_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/contacts/[id]/work-orders
 *
 * Paginated read of one contact's work orders plus the contact's total labor
 * cost. Powers the contact record view's Statistics section. Returns
 * `{ page: WorkOrdersForContactPage }`.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/contacts/[id]/work-orders",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const contactId = parseUuidParam(rawId, "id")
    const url = new URL(request.url)
    const { skip, take } = validateWorkOrdersPageQuery(url.searchParams)
    const page = await listWorkOrdersForContactUseCase({ contactId, skip, take })
    return routeJson(access, { page })
  } catch (error) {
    return routeError(access, error)
  }
}
