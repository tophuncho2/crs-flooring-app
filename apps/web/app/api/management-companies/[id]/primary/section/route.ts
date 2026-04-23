import { updateManagementCompanyUseCase } from "@builders/application"
import { getManagementCompanyById } from "@builders/db"
import { MANAGEMENT_COMPANIES_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateUpdateManagementCompanyInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: MANAGEMENT_COMPANIES_TOOL_SLUG,
    rateLimit: {
      scope: "managementCompanies.primary.section.replace",
      limit: 40,
      windowMs: 10 * 60 * 1000,
      route: "/api/management-companies/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateManagementCompanyInput, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getManagementCompanyById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { managementCompany: currentSnapshot },
      message:
        "Management company changed before section save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "managementCompanies.primary.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Management company primary section replaced",
        action: "managementCompanies.primary.section.replace",
        route: "/api/management-companies/[id]/primary/section",
        entityType: "flooringManagementCompany",
        entityId: id,
      },
      () => updateManagementCompanyUseCase(id, input),
    )

    const responseBody = { managementCompany: result }
    await finalizeMutationReceipt({
      scope: "managementCompanies.primary.section.replace",
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
