import { createWarehouseUseCase, listWarehousesUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateListWarehousesQuery, validateWarehouseInput } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/warehouses")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListWarehousesQuery(url.searchParams)
    const result = await listWarehousesUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "warehouses.create",
      route: "/api/warehouses",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateWarehouseInput)

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
      () => createWarehouseUseCase(input, access.user.email),
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
