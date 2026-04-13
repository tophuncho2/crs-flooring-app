import { SERVICES_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
import { parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { updateServiceUseCase, deleteServiceUseCase } from "@builders/application"
import { getServiceById } from "@/modules/services/data/queries"
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

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: SERVICES_TOOL_SLUG,
    rateLimit: {
      scope: "services.write",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/services/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => ({
      name: parseRequiredString(inputBody.name, "name"),
      unitId: parseRequiredString(inputBody.unitId, "unitId"),
      baseCost: parseRequiredString(inputBody.baseCost, "baseCost"),
      notes: parseOptionalString(inputBody.notes),
    }), { requireExpectedUpdatedAt: true })

    const currentSnapshot = await getServiceById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { service: currentSnapshot },
      message: "Service changed before save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "services.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Service updated",
        action: "services.update",
        route: "/api/services/[id]",
        entityType: "flooringService",
        entityId: id,
      },
      () => updateServiceUseCase(id, input),
    )

    const snapshot = await getServiceById(id)
    const responseBody = { service: snapshot }
    await finalizeMutationReceipt({
      scope: "services.update",
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
    const { id } = await params
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
