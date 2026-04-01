import { authorizeTemplatesRoute } from "@/modules/shared/access/templates-work-orders"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { createTemplateSalesRep } from "@/modules/templates/mutations"
import { listTemplateSalesReps } from "@/modules/templates/queries"
import { validateTemplateSalesRepInput } from "@/modules/templates/validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { items: await listTemplateSalesReps(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "templates.salesReps.write",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/templates/[id]/sales-reps",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const item = await createTemplateSalesRep(id, validateTemplateSalesRepInput(body))
    logRouteMutationSuccess(access, {
      message: "Template sales rep created",
      action: "templates.salesReps.create",
      route: "/api/templates/[id]/sales-reps",
      entityType: "flooringTemplateSalesRep",
      entityId: item.id,
      details: { templateId: id, contactId: item.contactId },
    })
    return routeJson(access, { item }, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Template sales rep creation failed",
        action: "templates.salesReps.create.error",
        route: "/api/templates/[id]/sales-reps",
        entityType: "flooringTemplateSalesRep",
        details: { templateId: id },
      },
      error,
    )
    return routeError(access, error)
  }
}
