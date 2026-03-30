import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { resolveWorkOrderInvoiceDownloadUrlUseCase } from "@/features/flooring/work-orders/application/invoice"
import { parseUuidParam } from "@/server/http/api-helpers"
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
    const downloadUrl = await resolveWorkOrderInvoiceDownloadUrlUseCase(id)
    const requestUrl = new URL(request.url)
    if (requestUrl.searchParams.get("format") === "json") {
      return routeJson(access, { downloadUrl })
    }

    return Response.redirect(downloadUrl, 302)
  } catch (error) {
    return routeError(access, error)
  }
}
