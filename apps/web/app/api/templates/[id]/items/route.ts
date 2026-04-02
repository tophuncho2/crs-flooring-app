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
import { createTemplateItem } from "@/modules/templates/mutations"
import { listTemplateItems } from "@/modules/templates/queries"
import { validateTemplateMaterialItemInput } from "@/modules/templates/validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/templates/[id]/items")
  if (rateLimited) return rateLimited

  try {
    const { id } = await params
    return routeJson(access, { items: await listTemplateItems(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "templates",
    rateLimit: {
      scope: "templates.items.write",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates/[id]/items",
    },
  })
  if (access instanceof Response) return access

  const { id } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateTemplateMaterialItemInput)
    const receipt = await enforceMutationReceipt({
      scope: "templates.items.create",
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
        message: "Template material item created",
        action: "templates.items.create",
        route: "/api/templates/[id]/items",
        entityType: "flooringTemplateItem",
      },
      () => createTemplateItem(id, input),
    )
    const responseBody = { item }
    await finalizeMutationReceipt({
      scope: "templates.items.create",
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
