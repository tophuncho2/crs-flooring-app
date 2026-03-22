import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { createWorkOrder } from "@/features/flooring/work-orders/mutations"
import { listWorkOrders } from "@/features/flooring/work-orders/queries"
import { validateCreateWorkOrderInput } from "@/features/flooring/work-orders/validators"
import { routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  try {
    return routeJson(access, {
      workOrders: await listWorkOrders(undefined, {
        searchQuery: "",
        isAscendingSort: true,
        isGroupingEnabled: false,
        groupByKeys: [],
      }),
    })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const workOrder = await createWorkOrder(validateCreateWorkOrderInput(body))
    return routeJson(access, { workOrder }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
