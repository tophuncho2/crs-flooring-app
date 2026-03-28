import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { createAppError } from "@/server/http/api-helpers"
import { withWorkOrderCapabilities } from "@/features/flooring/work-orders/transport/detail"
import {
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { deleteWorkOrderSalesRep, updateWorkOrderSalesRep } from "@/features/flooring/work-orders/mutations"
import { getWorkOrderById } from "@/features/flooring/work-orders/queries"
import { validateUpdateWorkOrderSalesRepInput } from "@/features/flooring/work-orders/validators"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string; repId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.write",
    rateLimit: {
      scope: "workOrders.salesReps.write",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/flooring/work-orders/[id]/sales-reps/[repId]",
    },
  })
  if (access instanceof Response) return access

  const { id, repId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateWorkOrderSalesRepInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    const currentItem = currentSnapshot.salesReps.find((item) => item.id === repId)
    if (!currentItem) {
      throw createAppError("Record not found", { status: 404 })
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentItem.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Sales rep changed before save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.salesReps.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    const item = await updateWorkOrderSalesRep(repId, input)
    const nextSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    logRouteMutationSuccess(access, {
      message: "Work order sales rep updated",
      action: "workOrders.salesReps.update",
      route: "/api/flooring/work-orders/[id]/sales-reps/[repId]",
      entityType: "flooringWorkOrderSalesRep",
      entityId: item.id,
      details: { contactId: item.contactId },
    })
    const responseBody = { item, workOrder: nextSnapshot }
    await finalizeMutationReceipt({
      scope: "workOrders.salesReps.update",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Work order sales rep update failed",
        action: "workOrders.salesReps.update.error",
        route: "/api/flooring/work-orders/[id]/sales-reps/[repId]",
        entityType: "flooringWorkOrderSalesRep",
        entityId: repId,
      },
      error,
    )
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.delete",
    rateLimit: {
      scope: "workOrders.salesReps.delete",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/flooring/work-orders/[id]/sales-reps/[repId]",
    },
  })
  if (access instanceof Response) return access

  const { id, repId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    const currentItem = currentSnapshot.salesReps.find((item) => item.id === repId)
    if (!currentItem) {
      throw createAppError("Record not found", { status: 404 })
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentItem.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Sales rep changed before delete completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.salesReps.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    await deleteWorkOrderSalesRep(repId)
    const nextSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    logRouteMutationSuccess(access, {
      message: "Work order sales rep deleted",
      action: "workOrders.salesReps.delete",
      route: "/api/flooring/work-orders/[id]/sales-reps/[repId]",
      entityType: "flooringWorkOrderSalesRep",
      entityId: repId,
    })
    const responseBody = { ok: true as const, workOrder: nextSnapshot }
    await finalizeMutationReceipt({
      scope: "workOrders.salesReps.delete",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Work order sales rep deletion failed",
        action: "workOrders.salesReps.delete.error",
        route: "/api/flooring/work-orders/[id]/sales-reps/[repId]",
        entityType: "flooringWorkOrderSalesRep",
        entityId: repId,
      },
      error,
    )
    return routeError(access, error)
  }
}
