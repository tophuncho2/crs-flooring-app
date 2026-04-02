import { deleteWarehouseRow, getWarehouseDetailRow, updateWarehouseRow } from "@/modules/warehouse/api"
import { authorizeWarehouseRoute } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/warehouses/[id]")
  if (rateLimited) return rateLimited

  try {
    const { id } = await params
    return routeJson(access, { warehouse: await getWarehouseDetailRow(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "warehouses.write",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/warehouses/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => inputBody, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getWarehouseDetailRow(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { warehouse: currentSnapshot },
      message: "Warehouse changed before save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "warehouses.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Warehouse updated",
        action: "warehouses.update",
        route: "/api/warehouses/[id]",
        entityType: "flooringWarehouse",
        entityId: id,
      },
      () => updateWarehouseRow(id, input),
    )

    const snapshot = await getWarehouseDetailRow(id)
    const responseBody = { warehouse: snapshot }
    await finalizeMutationReceipt({
      scope: "warehouses.update",
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
      scope: "warehouses.delete",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/warehouses/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getWarehouseDetailRow(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { warehouse: currentSnapshot },
      message: "Warehouse changed before delete completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "warehouses.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    await withMutationTelemetry(
      access,
      {
        message: "Warehouse deleted",
        action: "warehouses.delete",
        route: "/api/warehouses/[id]",
        entityType: "flooringWarehouse",
        entityId: id,
      },
      () => deleteWarehouseRow(id),
    )

    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "warehouses.delete",
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
