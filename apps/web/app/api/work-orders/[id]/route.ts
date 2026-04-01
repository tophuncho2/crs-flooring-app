import { authorizeWorkOrdersRoute } from "@/modules/shared/access/templates-work-orders"
import { deleteWorkOrderUseCase, updateWorkOrderUseCase } from "@/modules/work-orders/application/manage-work-order"
import { getWorkOrderById } from "@/modules/work-orders/queries"
import { withWorkOrderCapabilities } from "@/modules/work-orders/transport/detail"
import { validateUpdateWorkOrderInput } from "@/modules/work-orders/validators"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
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

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request, { capability: "workOrders.read" })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { workOrder: withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.write",
    rateLimit: {
      scope: "workOrders.update",
      limit: 60,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateWorkOrderInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Work order changed before save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.update",
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
        message: "Work order updated",
        action: "workOrders.update",
        route: "/api/work-orders/[id]",
        entityType: "flooringWorkOrder",
        entityId: id,
      },
      () => updateWorkOrderUseCase(id, input),
    )
    const snapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    const responseBody = {
      workOrder: snapshot,
    }
    await finalizeMutationReceipt({
      scope: "workOrders.update",
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
    capability: "workOrders.delete",
    rateLimit: {
      scope: "workOrders.delete",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Work order changed before delete completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.delete",
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
        message: "Work order deleted",
        action: "workOrders.delete",
        route: "/api/work-orders/[id]",
        entityType: "flooringWorkOrder",
        entityId: id,
      },
      () => deleteWorkOrderUseCase(id),
    )
    const responseBody = { ok: true as const }
    await finalizeMutationReceipt({
      scope: "workOrders.delete",
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
