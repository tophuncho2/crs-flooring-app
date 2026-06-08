import { createInventoryUseCase, listInventoryUseCase } from "@builders/application"
import { getInventoryDetailById } from "@builders/db"
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
import { validateCreateInventoryInput, validateListInventoryQuery } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/inventory")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListInventoryQuery(url.searchParams)
    const result = await listInventoryUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}

/**
 * POST /api/inventory — manually create one inventory row from a selected
 * product + warehouse. Synchronous create (no worker / outbox), no import or
 * PO# provenance. Snapshot columns are derived from the product server-side;
 * the body carries only the product/warehouse ids + editable fields. No
 * expected-updated-at check (fresh insert); the mutation receipt guards
 * against double-creation on retry.
 */
export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "inventory.create",
      route: "/api/inventory",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateInventoryInput, {
      requireExpectedUpdatedAt: false,
    })

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
        message: "Inventory item created",
        action: "inventory.create",
        route: "/api/inventory",
        entityType: "flooringInventory",
      },
      () => createInventoryUseCase(input),
    )

    // Return the full detail (row + adjustments) so the hub can seed its view on
    // the brand-new row. A fresh row always has zero adjustments.
    const detail = (await getInventoryDetailById(result.id)) ?? result
    const responseBody = { inventory: detail }
    await finalizeMutationReceipt({
      scope: "inventory.create",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
