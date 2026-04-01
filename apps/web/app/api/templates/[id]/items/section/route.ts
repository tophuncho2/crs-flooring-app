import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { saveTemplateMaterialItemsSectionUseCase } from "@/modules/templates/application/record-sections"
import { getTemplateById } from "@/modules/templates/queries"
import { validateUpdateTemplateMaterialItemsSectionInput } from "@/modules/templates/validators"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    rateLimit: {
      scope: "templates.items.section.replace",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates/[id]/items/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateTemplateMaterialItemsSectionInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getTemplateById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { template: currentSnapshot },
      message: "Template changed before section save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "templates.items.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }

    await withMutationTelemetry(
      access,
      {
        message: "Template material section replaced",
        action: "templates.items.section.replace",
        route: "/api/templates/[id]/items/section",
        entityType: "flooringTemplate",
        entityId: id,
      },
      () => saveTemplateMaterialItemsSectionUseCase(id, input),
    )

    const responseBody = {
      template: await getTemplateById(id),
    }
    await finalizeMutationReceipt({
      scope: "templates.items.section.replace",
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
