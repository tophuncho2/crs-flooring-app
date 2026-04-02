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
import { createTemplateSalesRep } from "@/modules/templates/mutations"
import { listTemplateSalesReps } from "@/modules/templates/queries"
import { validateTemplateSalesRepInput } from "@/modules/templates/validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/templates/[id]/sales-reps")
  if (rateLimited) return rateLimited

  try {
    const { id } = await params
    return routeJson(access, { items: await listTemplateSalesReps(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "templates",
    rateLimit: {
      scope: "templates.salesReps.write",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates/[id]/sales-reps",
    },
  })
  if (access instanceof Response) return access

  const { id } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateTemplateSalesRepInput)
    const receipt = await enforceMutationReceipt({
      scope: "templates.salesReps.create",
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
        message: "Template sales rep created",
        action: "templates.salesReps.create",
        route: "/api/templates/[id]/sales-reps",
        entityType: "flooringTemplateSalesRep",
      },
      () => createTemplateSalesRep(id, input),
    )
    const responseBody = { item }
    await finalizeMutationReceipt({
      scope: "templates.salesReps.create",
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
