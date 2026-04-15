import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { updateServiceUseCase } from "@builders/application"
import { getServiceById } from "@builders/db"
import { validateServiceInput } from "../../../_validators"
import { SERVICES_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
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
    toolSlug: SERVICES_TOOL_SLUG,
    rateLimit: {
      scope: "services.primary.section.replace",
      limit: 40,
      windowMs: 10 * 60 * 1000,
      route: "/api/services/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateServiceInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getServiceById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { service: currentSnapshot },
      message: "Service changed before section save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "services.primary.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }

    const result = await withMutationTelemetry(
      access,
      {
        message: "Service primary section replaced",
        action: "services.primary.section.replace",
        route: "/api/services/[id]/primary/section",
        entityType: "flooringService",
        entityId: id,
      },
      () => updateServiceUseCase(id, input),
    )

    const responseBody = {
      service: result,
    }
    await finalizeMutationReceipt({
      scope: "services.primary.section.replace",
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
