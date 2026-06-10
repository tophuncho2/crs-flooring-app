import { listLaborPaymentsForContactUseCase } from "@builders/application"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { validateLaborPaymentsPageQuery } from "./_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/contacts/[id]/labor-payments
 *
 * Paginated read of one contact's labor payments. Powers the contact record
 * view's labor-payments drilldown section. Returns `{ page: LaborPaymentPage }`.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/contacts/[id]/labor-payments",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const contactId = parseUuidParam(rawId, "id")
    const url = new URL(request.url)
    const { skip, take } = validateLaborPaymentsPageQuery(url.searchParams)
    const page = await listLaborPaymentsForContactUseCase({ contactId, skip, take })
    return routeJson(access, { page })
  } catch (error) {
    return routeError(access, error)
  }
}
