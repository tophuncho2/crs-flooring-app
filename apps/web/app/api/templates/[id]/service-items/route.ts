import { authorizeTemplatesRoute } from "@/modules/shared/access/templates-work-orders"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { createTemplateServiceItem } from "@/modules/templates/mutations"
import { listTemplateServiceItems } from "@/modules/templates/queries"
import { validateTemplateServiceItemInput } from "@/modules/templates/validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/templates/[id]/service-items")
  if (rateLimited) return rateLimited

  try {
    const { id } = await params
    return routeJson(access, { items: await listTemplateServiceItems(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "templates",
    rateLimit: {
      scope: "templates.serviceItems.write",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates/[id]/service-items",
    },
  })
  if (access instanceof Response) return access

  const { id } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateTemplateServiceItemInput)
    const receipt = await enforceMutationReceipt({
      scope: "templates.serviceItems.create",
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
        message: "Template service item created",
        action: "templates.serviceItems.create",
        route: "/api/templates/[id]/service-items",
        entityType: "flooringTemplateServiceItem",
      },
      () => createTemplateServiceItem(id, input),
    )
    const responseBody = { item }
    await finalizeMutationReceipt({
      scope: "templates.serviceItems.create",
      access,
      mutation,
      responseStatus: 201,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
