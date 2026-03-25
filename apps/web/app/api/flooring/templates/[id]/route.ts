import { authorizeTemplatesRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { deleteTemplateUseCase, updateTemplateUseCase } from "@/features/flooring/templates/application/manage-template"
import { getTemplateById } from "@/features/flooring/templates/queries"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { template: await getTemplateById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "templates.update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/templates/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const template = await withMutationTelemetry(
      access,
      {
        message: "Template updated",
        action: "templates.update",
        route: "/api/flooring/templates/[id]",
        entityType: "flooringTemplate",
        entityId: id,
      },
      () => updateTemplateUseCase(id, body),
    )
    return routeJson(access, { template })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "templates.delete",
    limit: 30,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/templates/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    await withMutationTelemetry(
      access,
      {
        message: "Template deleted",
        action: "templates.delete",
        route: "/api/flooring/templates/[id]",
        entityType: "flooringTemplate",
        entityId: id,
      },
      () => deleteTemplateUseCase(id),
    )
    return routeJson(access, { ok: true })
  } catch (error) {
    return routeError(access, error)
  }
}
