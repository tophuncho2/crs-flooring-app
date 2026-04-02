import { deleteInventoryRow } from "@/modules/inventory/api"
import { updateInventoryDetailUseCase } from "@/modules/inventory/application/inventory-detail"
import { getInventoryById } from "@/modules/inventory/data/queries"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: "warehouse",
    rateLimit: {
      scope: "query",
      limit: 100,
      windowMs: 60 * 1000,
      route: "/api/inventory/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    return routeJson(access, { inventory: await getInventoryById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "inventory.write",
      limit: 60,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => inputBody, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getInventoryById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { inventory: currentSnapshot },
      message: "Inventory changed before save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "inventory.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Inventory updated",
        action: "inventory.update",
        route: "/api/inventory/[id]",
        entityType: "flooringInventory",
        entityId: id,
      },
      () => updateInventoryDetailUseCase(id, input),
    )

    const snapshot = await getInventoryById(id)
    const responseBody = { inventory: snapshot }
    await finalizeMutationReceipt({
      scope: "inventory.update",
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

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "inventory.delete",
      limit: 40,
      windowMs: 10 * 60 * 1000,
      route: "/api/inventory/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getInventoryById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { inventory: currentSnapshot },
      message: "Inventory changed before delete completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "inventory.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Inventory deleted",
        action: "inventory.delete",
        route: "/api/inventory/[id]",
        entityType: "flooringInventory",
        entityId: id,
      },
      () => deleteInventoryRow(undefined, id),
    )

    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "inventory.delete",
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
