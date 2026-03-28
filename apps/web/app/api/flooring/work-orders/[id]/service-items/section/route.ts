import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { getWorkOrderById } from "@/features/flooring/work-orders/queries"
import { saveWorkOrderServiceItemsSection } from "@/features/flooring/work-orders/mutations"
import { withWorkOrderCapabilities } from "@/features/flooring/work-orders/transport/detail"
import { validateUpdateWorkOrderServiceSectionInput } from "@/features/flooring/work-orders/validators"
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
      scope: "workOrders.serviceItems.section.write",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/flooring/work-orders/[id]/service-items/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateWorkOrderServiceSectionInput, {
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
      scope: "workOrders.serviceItems.section.update",
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
        message: "Work order service section updated",
        action: "workOrders.serviceItems.section.update",
        route: "/api/flooring/work-orders/[id]/service-items/section",
        entityType: "flooringWorkOrder",
        entityId: id,
      },
      () => saveWorkOrderServiceItemsSection(id, input),
    )

    const responseBody = {
      workOrder: withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role),
    }
    await finalizeMutationReceipt({
      scope: "workOrders.serviceItems.section.update",
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
