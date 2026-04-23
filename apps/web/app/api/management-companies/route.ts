import { MANAGEMENT_COMPANIES_TOOL_SLUG, authorizeManagementCompaniesRoute } from "@/modules/shared/access/domain-tools"
import { createManagementCompany } from "@/modules/management-companies/data/mutations"
import { listManagementCompanies } from "@/modules/management-companies/data/queries"
import { validateCreateManagementCompanyInput } from "@/modules/management-companies/validators"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await authorizeManagementCompaniesRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/management-companies")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, {
      managementCompanies: await listManagementCompanies({}),
    })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: MANAGEMENT_COMPANIES_TOOL_SLUG,
    rateLimit: {
      scope: "managementCompanies.write",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/management-companies",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateManagementCompanyInput)
    const receipt = await enforceMutationReceipt({
      scope: "managementCompanies.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const managementCompany = await withMutationTelemetry(
      access,
      {
        message: "Management company created",
        action: "managementCompanies.create",
        route: "/api/management-companies",
        entityType: "flooringManagementCompany",
      },
      () => createManagementCompany(input),
    )

    const responseBody = { managementCompany }
    await finalizeMutationReceipt({
      scope: "managementCompanies.create",
      access,
      mutation,
      responseStatus: 201,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
