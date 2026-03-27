import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import {
  getWorkOrderInvoiceStatusUseCase,
  queueWorkOrderInvoiceUseCase,
} from "@/features/flooring/work-orders/application/invoice"
import { buildWorkOrderInvoiceStatusResponse } from "@/features/flooring/work-orders/transport/invoice"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const invoice = await getWorkOrderInvoiceStatusUseCase(id)
    return routeJson(access, buildWorkOrderInvoiceStatusResponse(id, invoice))
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.invoice.write",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/invoice",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const invoice = await withMutationTelemetry(
      access,
      {
        message: "Invoice generation requested",
        action: "workOrders.invoice.request",
        route: "/api/flooring/work-orders/[id]/invoice",
        entityType: "flooringWorkOrder",
        entityId: id,
      },
      () => queueWorkOrderInvoiceUseCase({
        workOrderId: id,
        triggeredByUserId: access.user.id,
        requestId: access.requestId,
      }),
    )

    return routeJson(access, buildWorkOrderInvoiceStatusResponse(id, invoice))
  } catch (error) {
    return routeError(access, error)
  }
}
