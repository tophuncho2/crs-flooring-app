import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { getWorkOrderInvoiceStatusUseCase } from "@/features/flooring/work-orders/application/invoice"
import { parseUuidParam } from "@/server/http/api-helpers"
import { createPresignedBucketObjectUrlForKey } from "@/server/storage/s3"
import { routeError, routeJson } from "@/server/http/route-helpers"

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

    if (!invoice.artifact) {
      return routeJson(access, { error: "Invoice is not ready yet" }, { status: 409 })
    }

    const downloadUrl = await createPresignedBucketObjectUrlForKey(invoice.artifact.storageKey)
    return Response.redirect(downloadUrl, 302)
  } catch (error) {
    return routeError(access, error)
  }
}
