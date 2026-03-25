import { deleteManagementCompany, updateManagementCompany } from "@/features/flooring/management-companies/data/mutations"
import { getManagementCompanyById } from "@/features/flooring/management-companies/data/queries"
import { validateUpdateManagementCompanyInput } from "@/features/flooring/management-companies/domain/validators"
import { authorizeManagementCompaniesRoute } from "@/features/flooring/shared/access/domain-tools"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeManagementCompaniesRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { managementCompany: await getManagementCompanyById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await authorizeManagementCompaniesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "managementCompanies.write",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/management-companies/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const managementCompany = await updateManagementCompany(id, validateUpdateManagementCompanyInput(body))
    return routeJson(access, { managementCompany })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await authorizeManagementCompaniesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "managementCompanies.delete",
    limit: 10,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/management-companies/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    await deleteManagementCompany(id)
    return routeJson(access, { ok: true })
  } catch (error) {
    return routeError(access, error)
  }
}
