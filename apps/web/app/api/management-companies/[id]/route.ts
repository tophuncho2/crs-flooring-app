import { deleteManagementCompanyUseCase } from "@builders/application"
import { getManagementCompanyById } from "@builders/db"
import { MANAGEMENT_COMPANIES_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
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
  const access = await applyRoutePolicy(request, {
    toolSlug: MANAGEMENT_COMPANIES_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/management-companies/[id]",
  )
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const managementCompany = await getManagementCompanyById(id)
    return routeJson(access, { managementCompany })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
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
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input: _input, mutation } = parseMutationEnvelope(body, (value) => value, {
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
      () => deleteManagementCompanyUseCase(id),
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
