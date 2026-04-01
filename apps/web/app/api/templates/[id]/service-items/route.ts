import { authorizeTemplatesRoute } from "@/modules/shared/access/templates-work-orders"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { createTemplateServiceItem } from "@/modules/templates/mutations"
import { listTemplateServiceItems } from "@/modules/templates/queries"
import { validateTemplateServiceItemInput } from "@/modules/templates/validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { items: await listTemplateServiceItems(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "templates.serviceItems.write",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/templates/[id]/service-items",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const item = await createTemplateServiceItem(id, validateTemplateServiceItemInput(body))
    logRouteMutationSuccess(access, {
      message: "Template service item created",
      action: "templates.serviceItems.create",
      route: "/api/templates/[id]/service-items",
      entityType: "flooringTemplateServiceItem",
      entityId: item.id,
      details: { templateId: id, serviceId: item.serviceId ?? null, unitId: item.unitId },
    })
    return routeJson(access, { item }, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Template service item creation failed",
        action: "templates.serviceItems.create.error",
        route: "/api/templates/[id]/service-items",
        entityType: "flooringTemplateServiceItem",
        details: { templateId: id },
      },
      error,
    )
    return routeError(access, error)
  }
}
