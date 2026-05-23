import { updatePropertyUseCase } from "@builders/application"
import { getPropertyById } from "@builders/db"
import { PROPERTIES_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
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
import { validateUpdatePropertyInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: PROPERTIES_TOOL_SLUG,
    rateLimit: {
      ...CRUD_UPDATE_SECTION,
      scope: "properties.primary.section.replace",
      route: "/api/properties/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdatePropertyInput, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getPropertyById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { property: currentSnapshot },
      message: "Property changed before section save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "properties.primary.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Property primary section replaced",
        action: "properties.primary.section.replace",
        route: "/api/properties/[id]/primary/section",
        entityType: "flooringProperty",
        entityId: id,
      },
      () => updatePropertyUseCase(id, input),
    )

    const responseBody = { property: result }
    await finalizeMutationReceipt({
      scope: "properties.primary.section.replace",
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
