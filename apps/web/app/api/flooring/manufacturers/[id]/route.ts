import {
  deleteManufacturerRecord,
  replaceManufacturerPrimarySection,
  validateUpdateManufacturerPrimarySectionInput,
} from "@/features/flooring/manufacturers/application/manage-manufacturer"
import { getManufacturerById } from "@/features/flooring/manufacturers/queries"
import { MANUFACTURERS_TOOL_SLUG } from "@/features/flooring/shared/access/lookup-domains"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
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

export async function PATCH(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: MANUFACTURERS_TOOL_SLUG,
    rateLimit: {
      scope: "manufacturers.update",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/flooring/manufacturers/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateManufacturerPrimarySectionInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getManufacturerById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { manufacturer: currentSnapshot },
      message: "Manufacturer changed before save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "manufacturers.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    const manufacturer = await withMutationTelemetry(
      access,
      {
        message: "Manufacturer updated",
        action: "manufacturers.update",
        route: "/api/flooring/manufacturers/[id]",
        entityType: "flooringManufacturer",
        entityId: id,
      },
      () => replaceManufacturerPrimarySection(id, input),
    )

    const responseBody = {
      manufacturer,
    }
    await finalizeMutationReceipt({
      scope: "manufacturers.update",
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

export async function DELETE(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: MANUFACTURERS_TOOL_SLUG,
    rateLimit: {
      scope: "manufacturers.delete",
      limit: 10,
      windowMs: 10 * 60 * 1000,
      route: "/api/flooring/manufacturers/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getManufacturerById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { manufacturer: currentSnapshot },
      message: "Manufacturer changed before delete completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "manufacturers.delete",
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
        message: "Manufacturer deleted",
        action: "manufacturers.delete",
        route: "/api/flooring/manufacturers/[id]",
        entityType: "flooringManufacturer",
        entityId: id,
      },
      () => deleteManufacturerRecord(id),
    )
    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "manufacturers.delete",
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
