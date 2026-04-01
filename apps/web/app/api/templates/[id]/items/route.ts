import { authorizeTemplatesRoute } from "@/modules/shared/access/templates-work-orders"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { createTemplateItem } from "@/modules/templates/mutations"
import { listTemplateItems } from "@/modules/templates/queries"
import { validateTemplateMaterialItemInput } from "@/modules/templates/validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { items: await listTemplateItems(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "templates.items.write",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/templates/[id]/items",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const item = await createTemplateItem(id, validateTemplateMaterialItemInput(body))
    logRouteMutationSuccess(access, {
      message: "Template material item created",
      action: "templates.items.create",
      route: "/api/templates/[id]/items",
      entityType: "flooringTemplateItem",
      entityId: item.id,
      details: { templateId: id, productId: item.productId },
    })
    return routeJson(access, { item }, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Template material item creation failed",
        action: "templates.items.create.error",
        route: "/api/templates/[id]/items",
        entityType: "flooringTemplateItem",
        details: { templateId: id },
      },
      error,
    )
    return routeError(access, error)
  }
}
