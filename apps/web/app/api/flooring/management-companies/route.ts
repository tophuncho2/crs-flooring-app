import { authorizeManagementCompaniesRoute } from "@/features/flooring/shared/access/domain-tools"
import { createManagementCompany } from "@/features/flooring/management-companies/mutations"
import { listManagementCompanies } from "@/features/flooring/management-companies/queries"
import { validateCreateManagementCompanyInput } from "@/features/flooring/management-companies/validators"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeManagementCompaniesRoute(request)
  if (access instanceof Response) return access

  try {
    return routeJson(access, {
      managementCompanies: await listManagementCompanies(undefined, {
        searchQuery: "",
        isAscendingSort: true,
        isGroupingEnabled: false,
        groupByKeys: [],
      }),
    })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizeManagementCompaniesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "managementCompanies.write",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/management-companies",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await request.json()) as Record<string, unknown>
    const managementCompany = await createManagementCompany(validateCreateManagementCompanyInput(body))
    return routeJson(access, { managementCompany }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
