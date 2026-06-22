import { deleteWarehouseUseCase, WarehouseExecutionError } from "@builders/application"
import { getWarehouseById, getWarehouseDetailById } from "@builders/db"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/warehouses/[id]")
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const warehouse = await getWarehouseDetailById(id, { withNeighbors: true })
    if (!warehouse) {
      throw new WarehouseExecutionError({
        code: "WAREHOUSE_NOT_FOUND",
        message: "Warehouse not found",
        status: 404,
      })
    }
    return routeJson(access, { warehouse })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_DELETE,
      scope: "warehouses.delete",
      route: "/api/warehouses/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getWarehouseById(id)
    if (!currentSnapshot) {
      throw new WarehouseExecutionError({
        code: "WAREHOUSE_NOT_FOUND",
        message: "Warehouse not found",
        status: 404,
      })
    }
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
      () => deleteWarehouseUseCase(id),
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
