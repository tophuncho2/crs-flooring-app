import { SERVICES_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
import { parseUuidParam } from "@/server/http/api-helpers"
import { deleteServiceUseCase } from "@builders/application"
import { getServiceById } from "@builders/db"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
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

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: SERVICES_TOOL_SLUG,
    rateLimit: {
      scope: "services.delete",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/services/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getServiceById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { service: currentSnapshot },
      message: "Service changed before delete completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "services.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Service deleted",
        action: "services.delete",
        route: "/api/services/[id]",
        entityType: "flooringService",
        entityId: id,
      },
      () => deleteServiceUseCase(id),
    )

    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "services.delete",
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
