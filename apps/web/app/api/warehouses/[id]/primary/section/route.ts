import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { updateWarehouseUseCase, WarehouseExecutionError } from "@builders/application"
import { getWarehouseById } from "@builders/db"
import { validateWarehouseInput } from "../../../_validators"
import { WAREHOUSE_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: WAREHOUSE_TOOL_SLUG,
    rateLimit: {
      ...CRUD_UPDATE_SECTION,
      scope: "warehouses.primary.section.replace",
      route: "/api/warehouses/[id]/primary/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateWarehouseInput, {
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
      message: "Warehouse changed before section save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "warehouses.primary.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }

    const result = await withMutationTelemetry(
      access,
      {
        message: "Warehouse primary section replaced",
        action: "warehouses.primary.section.replace",
        route: "/api/warehouses/[id]/primary/section",
        entityType: "flooringWarehouse",
        entityId: id,
      },
      () => updateWarehouseUseCase(id, input),
    )

    const responseBody = {
      warehouse: result,
    }
    await finalizeMutationReceipt({
      scope: "warehouses.primary.section.replace",
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
