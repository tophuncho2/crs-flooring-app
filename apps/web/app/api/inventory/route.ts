import { listInventory } from "@builders/db"
import { createInventoryUseCase } from "@builders/application"
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
import { validateCreateInventoryInput } from "./_validators"

export async function GET(request: Request) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/inventory")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, { inventory: await listInventory() })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "inventory.create",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateInventoryInput)

    const receipt = await enforceMutationReceipt({
      scope: "inventory.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Inventory row created",
        action: "inventory.create",
        route: "/api/inventory",
        entityType: "flooringInventory",
      },
      () => createInventoryUseCase(input),
    )

    const responseBody = { inventory: result }
    await finalizeMutationReceipt({
      scope: "inventory.create",
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
