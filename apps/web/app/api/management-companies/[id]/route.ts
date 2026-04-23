import { deleteManagementCompany, updateManagementCompany } from "@/modules/management-companies/data/mutations"
import { getManagementCompanyById } from "@/modules/management-companies/data/queries"
import { validateUpdateManagementCompanyInput } from "@/modules/management-companies/validators"
import { MANAGEMENT_COMPANIES_TOOL_SLUG, authorizeManagementCompaniesRoute } from "@/modules/shared/access/domain-tools"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeManagementCompaniesRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/management-companies/[id]")
  if (rateLimited) return rateLimited

  try {
    const { id } = await params
    return routeJson(access, { managementCompany: await getManagementCompanyById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: MANAGEMENT_COMPANIES_TOOL_SLUG,
    rateLimit: {
      scope: "managementCompanies.write",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/management-companies/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateManagementCompanyInput, { requireExpectedUpdatedAt: true })

    const currentSnapshot = await getManagementCompanyById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { managementCompany: currentSnapshot },
      message: "Management company changed before save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "managementCompanies.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Management company updated",
        action: "managementCompanies.update",
        route: "/api/management-companies/[id]",
        entityType: "flooringManagementCompany",
        entityId: id,
      },
      () => updateManagementCompany(id, input),
    )

    const snapshot = await getManagementCompanyById(id)
    const responseBody = { managementCompany: snapshot }
    await finalizeMutationReceipt({
      scope: "managementCompanies.update",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: MANAGEMENT_COMPANIES_TOOL_SLUG,
    rateLimit: {
      scope: "managementCompanies.delete",
      limit: 10,
      windowMs: 10 * 60 * 1000,
      route: "/api/management-companies/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getManagementCompanyById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { managementCompany: currentSnapshot },
      message: "Management company changed before delete completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "managementCompanies.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Management company deleted",
        action: "managementCompanies.delete",
        route: "/api/management-companies/[id]",
        entityType: "flooringManagementCompany",
        entityId: id,
      },
      () => deleteManagementCompany(id),
    )

    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "managementCompanies.delete",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
