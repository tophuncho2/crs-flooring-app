import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { deleteTemplateSalesRep, updateTemplateSalesRep } from "@/modules/templates/mutations"
import { getTemplateById } from "@/modules/templates/queries"
import { validateUpdateTemplateSalesRepInput } from "@/modules/templates/validators"

type RouteContext = {
  params: Promise<{ id: string; repId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "templates",
    rateLimit: {
      scope: "templates.salesReps.write",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates/[id]/sales-reps/[repId]",
    },
  })
  if (access instanceof Response) return access

  const { id, repId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateTemplateSalesRepInput, {
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
      scope: "templates.salesReps.update",
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
        message: "Template sales rep updated",
        action: "templates.salesReps.update",
        route: "/api/templates/[id]/sales-reps/[repId]",
        entityType: "flooringTemplateSalesRep",
        entityId: repId,
      },
      () => updateTemplateSalesRep(repId, input),
    )
    const responseBody = { item }
    await finalizeMutationReceipt({
      scope: "templates.salesReps.update",
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
      scope: "templates.salesReps.delete",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates/[id]/sales-reps/[repId]",
    },
  })
  if (access instanceof Response) return access

  const { id, repId } = await params

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
      scope: "templates.salesReps.delete",
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
        message: "Template sales rep deleted",
        action: "templates.salesReps.delete",
        route: "/api/templates/[id]/sales-reps/[repId]",
        entityType: "flooringTemplateSalesRep",
        entityId: repId,
      },
      () => deleteTemplateSalesRep(repId),
    )
    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "templates.salesReps.delete",
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
