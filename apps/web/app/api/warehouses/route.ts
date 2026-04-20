import { createWarehouseRow, listWarehouseRows } from "@/modules/warehouse/data/api"
import { authorizeWarehouseRoute } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/warehouses")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, { warehouses: await listWarehouseRows() })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "warehouses.write",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/warehouses",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => inputBody)
    const receipt = await enforceMutationReceipt({
      scope: "warehouses.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const warehouse = await withMutationTelemetry(
      access,
      {
        message: "Warehouse created",
        action: "warehouses.create",
        route: "/api/warehouses",
        entityType: "flooringWarehouse",
      },
      () => createWarehouseRow(input),
    )

    const responseBody = { warehouse }
    await finalizeMutationReceipt({
      scope: "warehouses.create",
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
