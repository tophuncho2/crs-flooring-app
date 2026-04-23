import { deleteProperty, updateProperty } from "@/modules/properties/data/mutations"
import { getPropertyById } from "@/modules/properties/data/queries"
import { validateUpdatePropertyInput } from "@/modules/properties/validators"
import { PROPERTIES_TOOL_SLUG, authorizePropertiesRoute } from "@/modules/shared/access/domain-tools"
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
  const access = await authorizePropertiesRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/properties/[id]")
  if (rateLimited) return rateLimited

  try {
    const { id } = await params
    return routeJson(access, { property: await getPropertyById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: PROPERTIES_TOOL_SLUG,
    rateLimit: {
      scope: "properties.write",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/properties/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdatePropertyInput, { requireExpectedUpdatedAt: true })

    const currentSnapshot = await getPropertyById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { property: currentSnapshot },
      message: "Property changed before save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "properties.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Property updated",
        action: "properties.update",
        route: "/api/properties/[id]",
        entityType: "flooringProperty",
        entityId: id,
      },
      () => updateProperty(id, input),
    )

    const snapshot = await getPropertyById(id)
    const responseBody = { property: snapshot }
    await finalizeMutationReceipt({
      scope: "properties.update",
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
    toolSlug: PROPERTIES_TOOL_SLUG,
    rateLimit: {
      scope: "properties.delete",
      limit: 10,
      windowMs: 10 * 60 * 1000,
      route: "/api/properties/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getPropertyById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { property: currentSnapshot },
      message: "Property changed before delete completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "properties.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Property deleted",
        action: "properties.delete",
        route: "/api/properties/[id]",
        entityType: "flooringProperty",
        entityId: id,
      },
      () => deleteProperty(id),
    )

    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "properties.delete",
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
