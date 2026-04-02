import { createInventoryRow, listInventoryRows } from "@/modules/inventory/api"
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
      route: "/api/inventory",
    },
  })
  if (access instanceof Response) return access

  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")?.trim() ?? ""
    return routeJson(access, { inventory: await listInventoryRows(undefined, productId || undefined) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "inventory.write",
      limit: 60,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => inputBody)
    const receipt = await enforceMutationReceipt({
      scope: "inventory.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const inventory = await withMutationTelemetry(
      access,
      {
        message: "Inventory created",
        action: "inventory.create",
        route: "/api/inventory",
        entityType: "flooringInventory",
      },
      () => createInventoryRow(undefined, input),
    )

    const responseBody = { inventory }
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
