import { authorizeWarehouseRoute } from "@/modules/shared/access/domain-tools"
import { createCutLogUseCase, listCutLogsUseCase } from "@/modules/inventory/application/cut-logs"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  try {
    const { searchParams } = new URL(request.url)
    const inventoryId = searchParams.get("inventoryId")?.trim() || null
    return routeJson(access, { cutLogs: await listCutLogsUseCase(inventoryId) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "inventory.cutLogs.write",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    route: "/api/cut-logs",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await request.json()) as Record<string, unknown>
    const cutLog = await withMutationTelemetry(
      access,
      {
        message: "Cut log created",
        action: "inventory.cutLogs.create",
        route: "/api/cut-logs",
        entityType: "flooringCutLog",
      },
      () => createCutLogUseCase(body),
    )
    return routeJson(access, { cutLog }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
