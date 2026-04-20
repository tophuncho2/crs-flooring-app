import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { saveSectionsWithLocationsUseCase, WarehouseExecutionError } from "@builders/application"
import { getWarehouseById, getWarehouseDetailById } from "@builders/db"
import { validateSectionsWithLocationsDiff } from "../../../_validators"
import { WAREHOUSE_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { parseUuidParam } from "@/server/http/api-helpers"
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
      scope: "warehouses.sections-locations.section.replace",
      limit: 40,
      windowMs: 10 * 60 * 1000,
      route: "/api/warehouses/[id]/sections-locations/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateSectionsWithLocationsDiff, {
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
      scope: "warehouses.sections-locations.section.replace",
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
        message: "Warehouse sections-locations section replaced",
        action: "warehouses.sections-locations.section.replace",
        route: "/api/warehouses/[id]/sections-locations/section",
        entityType: "flooringWarehouse",
        entityId: id,
      },
      () => saveSectionsWithLocationsUseCase(id, input),
    )

    const detail = await getWarehouseDetailById(id)
    const responseBody = {
      warehouse: detail,
      tempIdMap: result.tempIdMap,
    }
    await finalizeMutationReceipt({
      scope: "warehouses.sections-locations.section.replace",
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
