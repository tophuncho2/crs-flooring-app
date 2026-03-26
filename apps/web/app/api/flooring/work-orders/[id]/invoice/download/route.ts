import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { getWorkOrderInvoiceStatusUseCase } from "@/features/flooring/work-orders/application/invoice"
import { buildBucketObjectUrlForKey } from "@/server/storage/s3"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const invoice = await getWorkOrderInvoiceStatusUseCase(id)

    if (invoice.invoiceStatus !== "READY" || !invoice.invoiceFileKey) {
      return routeJson(access, { error: "Invoice is not ready yet" }, { status: 409 })
    }

    return Response.redirect(buildBucketObjectUrlForKey(invoice.invoiceFileKey), 302)
  } catch (error) {
    return routeError(access, error)
  }
}
