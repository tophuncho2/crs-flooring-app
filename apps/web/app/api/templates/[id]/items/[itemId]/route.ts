import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { deleteTemplateItem, updateTemplateItem } from "@/modules/templates/mutations"
import { getTemplateById } from "@/modules/templates/queries"
import { validateUpdateTemplateMaterialItemInput } from "@/modules/templates/validators"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "templates",
    rateLimit: {
      scope: "templates.items.write",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates/[id]/items/[itemId]",
    },
  })
  if (access instanceof Response) return access

  const { id, itemId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateTemplateMaterialItemInput, {
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
      scope: "templates.items.update",
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
        message: "Template material item updated",
        action: "templates.items.update",
        route: "/api/templates/[id]/items/[itemId]",
        entityType: "flooringTemplateItem",
        entityId: itemId,
      },
      () => updateTemplateItem(itemId, input),
    )
    const responseBody = { item }
    await finalizeMutationReceipt({
      scope: "templates.items.update",
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
      scope: "templates.items.delete",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates/[id]/items/[itemId]",
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
      scope: "templates.items.delete",
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
        message: "Template material item deleted",
        action: "templates.items.delete",
        route: "/api/templates/[id]/items/[itemId]",
        entityType: "flooringTemplateItem",
        entityId: itemId,
      },
      () => deleteTemplateItem(itemId),
    )
    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "templates.items.delete",
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
