import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { deleteTemplateServiceItem, updateTemplateServiceItem } from "@/modules/templates/mutations"
import { getTemplateById } from "@/modules/templates/queries"
import { validateUpdateTemplateServiceItemInput } from "@/modules/templates/validators"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "templates",
    rateLimit: {
      scope: "templates.serviceItems.write",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates/[id]/service-items/[itemId]",
    },
  })
  if (access instanceof Response) return access

  const { id, itemId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateTemplateServiceItemInput, {
      requireExpectedUpdatedAt: true,
    })
    const template = await getTemplateById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: template.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { template },
      message: "Template changed before save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "templates.serviceItems.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    const item = await withMutationTelemetry(
      access,
      {
        message: "Template service item updated",
        action: "templates.serviceItems.update",
        route: "/api/templates/[id]/service-items/[itemId]",
        entityType: "flooringTemplateServiceItem",
        entityId: itemId,
      },
      () => updateTemplateServiceItem(itemId, input),
    )
    const responseBody = { item }
    await finalizeMutationReceipt({
      scope: "templates.serviceItems.update",
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
    toolSlug: "templates",
    rateLimit: {
      scope: "templates.serviceItems.delete",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates/[id]/service-items/[itemId]",
    },
  })
  if (access instanceof Response) return access

  const { id, itemId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })
    const template = await getTemplateById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: template.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { template },
      message: "Template changed before delete completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "templates.serviceItems.delete",
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
        message: "Template service item deleted",
        action: "templates.serviceItems.delete",
        route: "/api/templates/[id]/service-items/[itemId]",
        entityType: "flooringTemplateServiceItem",
        entityId: itemId,
      },
      () => deleteTemplateServiceItem(itemId),
    )
    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "templates.serviceItems.delete",
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
