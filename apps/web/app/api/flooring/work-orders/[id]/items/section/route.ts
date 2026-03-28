import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { getWorkOrderById } from "@/features/flooring/work-orders/queries"
import { saveWorkOrderMaterialItemsSection } from "@/features/flooring/work-orders/mutations"
import { withWorkOrderCapabilities } from "@/features/flooring/work-orders/transport/detail"
import { validateUpdateWorkOrderMaterialItemsSectionInput } from "@/features/flooring/work-orders/validators"
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
    capability: "workOrders.write",
    rateLimit: {
      scope: "workOrders.items.section.replace",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/flooring/work-orders/[id]/items/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateWorkOrderMaterialItemsSectionInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Work order changed before section save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.items.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }

    await withMutationTelemetry(
      access,
      {
        message: "Work order material section replaced",
        action: "workOrders.items.section.replace",
        route: "/api/flooring/work-orders/[id]/items/section",
        entityType: "flooringWorkOrder",
        entityId: id,
      },
      () => saveWorkOrderMaterialItemsSection(id, input),
    )

    const responseBody = {
      workOrder: withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role),
    }
    await finalizeMutationReceipt({
      scope: "workOrders.items.section.replace",
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
