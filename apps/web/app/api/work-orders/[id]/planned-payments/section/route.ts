import { saveWorkOrderPlannedPaymentsSectionUseCase } from "@builders/application"
import { getWorkOrderDetailById, listWorkOrderPlannedPayments } from "@builders/db"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
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
import { validateWorkOrderPlannedPaymentsDiffInput } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_UPDATE_SECTION,
      scope: "work-orders.planned-payments.section.replace",
      route: "/api/work-orders/[id]/planned-payments/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input: diff, mutation } = parseMutationEnvelope(
      body,
      validateWorkOrderPlannedPaymentsDiffInput,
      { requireExpectedUpdatedAt: true },
    )

    const currentSnapshot = await getWorkOrderDetailById(id, { withNeighbors: false })
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Work order changed before planned payments save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.planned-payments.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Work order planned payments section replaced",
        action: "work-orders.planned-payments.section.replace",
        route: "/api/work-orders/[id]/planned-payments/section",
        entityType: "flooringWorkOrder",
        entityId: id,
      },
      () => saveWorkOrderPlannedPaymentsSectionUseCase({ workOrderId: id, diff }, access.user.email),
    )

    const [detail, plannedPayments] = await Promise.all([
      getWorkOrderDetailById(id),
      listWorkOrderPlannedPayments(id),
    ])
    const responseBody = {
      workOrder: detail,
      plannedPayments,
      tempIdMap: result.tempIdMap,
    }
    await finalizeMutationReceipt({
      scope: "work-orders.planned-payments.section.replace",
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
