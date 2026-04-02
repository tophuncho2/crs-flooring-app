import { deleteTemplateUseCase, updateTemplateUseCase } from "@/modules/templates/application/manage-template"
import { TEMPLATES_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { getTemplateById } from "@/modules/templates/queries"
import { validateUpdateTemplateInput } from "@/modules/templates/validators"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { parseUuidParam } from "@/server/http/api-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: TEMPLATES_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/templates/[id]")
  if (rateLimited) return rateLimited

  try {
    const { id } = await params
    return routeJson(access, { template: await getTemplateById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: TEMPLATES_TOOL_SLUG,
    rateLimit: {
      scope: "templates.update",
      limit: 60,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateTemplateInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = await getTemplateById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { template: currentSnapshot },
      message: "Template changed before save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "templates.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    const template = await withMutationTelemetry(
      access,
      {
        message: "Template updated",
        action: "templates.update",
        route: "/api/templates/[id]",
        entityType: "flooringTemplate",
        entityId: id,
      },
      () => updateTemplateUseCase(id, input),
    )
    const responseBody = { template }
    await finalizeMutationReceipt({
      scope: "templates.update",
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
    capability: "system.access",
    toolSlug: TEMPLATES_TOOL_SLUG,
    rateLimit: {
      scope: "templates.delete",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates/[id]",
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
    const currentSnapshot = await getTemplateById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { template: currentSnapshot },
      message: "Template changed before delete completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "templates.delete",
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
        message: "Template deleted",
        action: "templates.delete",
        route: "/api/templates/[id]",
        entityType: "flooringTemplate",
        entityId: id,
      },
      () => deleteTemplateUseCase(id),
    )
    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "templates.delete",
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
