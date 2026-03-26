import { authorizeTemplatesRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { listTemplateCalculationRows } from "@/features/flooring/templates/queries"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { items: await listTemplateCalculationRows(id) })
  } catch (error) {
    return routeError(access, error)
  }
}
