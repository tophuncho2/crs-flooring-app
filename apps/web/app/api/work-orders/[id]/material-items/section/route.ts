import { saveWorkOrderMaterialItemsSectionUseCase } from "@builders/application"
import { getWorkOrderDetailById } from "@builders/db"
import { WORK_ORDERS_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateWorkOrderMaterialItemsDiffInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: WORK_ORDERS_TOOL_SLUG,
    rateLimit: {
      scope: "work-orders.material-items.section.replace",
      limit: 40,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/material-items/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input: diff, mutation } = parseMutationEnvelope(
      body,
      validateWorkOrderMaterialItemsDiffInput,
      { requireExpectedUpdatedAt: true },
    )

    const currentSnapshot = await getWorkOrderDetailById(id)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Work order changed before material items save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.material-items.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Work order material items section replaced",
        action: "work-orders.material-items.section.replace",
        route: "/api/work-orders/[id]/material-items/section",
        entityType: "flooringWorkOrder",
        entityId: id,
      },
      () => saveWorkOrderMaterialItemsSectionUseCase({ workOrderId: id, diff }),
    )

    const detail = await getWorkOrderDetailById(id)
    const responseBody = {
      workOrder: detail,
      tempIdMap: result.tempIdMap,
    }
    await finalizeMutationReceipt({
      scope: "work-orders.material-items.section.replace",
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
