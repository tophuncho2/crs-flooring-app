import { saveTemplateMaterialItemsSectionUseCase } from "@builders/application"
import { getTemplateById } from "@builders/db"
import { TEMPLATES_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateTemplateMaterialItemsDiffInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: TEMPLATES_TOOL_SLUG,
    rateLimit: {
      ...CRUD_UPDATE_SECTION,
      scope: "templates.material-items.section.replace",
      route: "/api/templates/[id]/material-items/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input: diff, mutation } = parseMutationEnvelope(
      body,
      validateTemplateMaterialItemsDiffInput,
      { requireExpectedUpdatedAt: true },
    )

    const currentSnapshot = await getTemplateById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { template: currentSnapshot },
      message: "Template changed before material items save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "templates.material-items.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Template material items section replaced",
        action: "templates.material-items.section.replace",
        route: "/api/templates/[id]/material-items/section",
        entityType: "flooringTemplate",
        entityId: id,
      },
      () => saveTemplateMaterialItemsSectionUseCase({ templateId: id, diff }),
    )

    const detail = await getTemplateById(id)
    const responseBody = {
      template: detail,
      tempIdMap: result.tempIdMap,
    }
    await finalizeMutationReceipt({
      scope: "templates.material-items.section.replace",
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
