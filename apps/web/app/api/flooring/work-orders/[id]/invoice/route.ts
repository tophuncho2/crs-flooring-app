import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import {
  getWorkOrderInvoiceStatusUseCase,
  queueWorkOrderInvoiceUseCase,
} from "@/features/flooring/work-orders/application/invoice"
import { getWorkOrderById } from "@/features/flooring/work-orders/queries"
import { withWorkOrderCapabilities } from "@/features/flooring/work-orders/transport/detail"
import { buildWorkOrderInvoiceStatusResponse } from "@/features/flooring/work-orders/transport/invoice"
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

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request, { capability: "workOrders.read" })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const invoice = await getWorkOrderInvoiceStatusUseCase(id)
    return routeJson(access, buildWorkOrderInvoiceStatusResponse(id, invoice))
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.invoiceGenerate",
    rateLimit: {
      scope: "workOrders.invoice.write",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/flooring/work-orders/[id]/invoice",
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
    const currentSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Work order changed before invoice generation was requested. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.invoice.request",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }

    const invoice = await withMutationTelemetry(
      access,
      {
        message: "Invoice generation requested",
        action: "workOrders.invoice.request",
        route: "/api/flooring/work-orders/[id]/invoice",
        entityType: "flooringWorkOrder",
        entityId: id,
      },
      () =>
        queueWorkOrderInvoiceUseCase({
          workOrderId: id,
          triggeredByUserId: access.user.id,
          requestId: access.requestId,
        }),
    )

    const responseBody = {
      ...buildWorkOrderInvoiceStatusResponse(id, invoice),
      workOrder: currentSnapshot,
    }

    await finalizeMutationReceipt({
      scope: "workOrders.invoice.request",
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
