import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { deleteWorkOrder, updateWorkOrder } from "@/features/flooring/work-orders/mutations"
import { getWorkOrderById } from "@/features/flooring/work-orders/queries"
import { validateUpdateWorkOrderInput } from "@/features/flooring/work-orders/validators"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { workOrder: await getWorkOrderById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const workOrder = await updateWorkOrder(id, validateUpdateWorkOrderInput(body))
    return routeJson(access, { workOrder })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    await deleteWorkOrder(id)
    return routeJson(access, { ok: true })
  } catch (error) {
    return routeError(access, error)
  }
}
