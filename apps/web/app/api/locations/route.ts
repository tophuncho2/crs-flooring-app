import { createLocationRow, listLocationRows, parseWarehouseFilter } from "@/modules/warehouse/data/api"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: "warehouse",
    rateLimit: {
      scope: "query",
      limit: 100,
      windowMs: 60 * 1000,
      route: "/api/locations",
    },
  })
  if (access instanceof Response) return access

  try {
    const { searchParams } = new URL(request.url)
    return routeJson(access, { locations: await listLocationRows(undefined, parseWarehouseFilter(searchParams.get("warehouseId"))) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "warehouse.locations.write",
      limit: 60,
      windowMs: 10 * 60 * 1000,
      route: "/api/locations",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => inputBody)
    const receipt = await enforceMutationReceipt({
      scope: "locations.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const location = await withMutationTelemetry(
      access,
      {
        message: "Warehouse location created",
        action: "locations.create",
        route: "/api/locations",
        entityType: "flooringLocation",
      },
      () => createLocationRow(undefined, input),
    )

    const responseBody = { location }
    await finalizeMutationReceipt({
      scope: "locations.create",
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
