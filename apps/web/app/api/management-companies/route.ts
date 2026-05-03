import {
  createManagementCompanyUseCase,
  listManagementCompaniesUseCase,
} from "@builders/application"
import { MANAGEMENT_COMPANIES_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import {
  validateCreateManagementCompanyInput,
  validateListManagementCompaniesQuery,
} from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: MANAGEMENT_COMPANIES_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/management-companies")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListManagementCompaniesQuery(url.searchParams)
    const result = await listManagementCompaniesUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: MANAGEMENT_COMPANIES_TOOL_SLUG,
    rateLimit: {
      scope: "managementCompanies.create",
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

    const result = await withMutationTelemetry(
      access,
      {
        message: "Management company created",
        action: "managementCompanies.create",
        route: "/api/management-companies",
        entityType: "flooringManagementCompany",
      },
      () => createManagementCompanyUseCase(input),
    )

    const responseBody = { managementCompany: result }
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
