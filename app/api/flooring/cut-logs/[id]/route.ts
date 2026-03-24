import { deleteCutLogUseCase } from "@/features/flooring/inventory/application/cut-logs"
import { authorizeWarehouseRoute } from "@/features/flooring/shared/access/domain-tools"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "inventory.cutLogs.delete",
    limit: 30,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/cut-logs/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    const result = await withMutationTelemetry(
      access,
      {
        message: "Cut log deleted",
        action: "inventory.cutLogs.delete",
        route: "/api/flooring/cut-logs/[id]",
        entityType: "flooringCutLog",
        entityId: id,
      },
      () => deleteCutLogUseCase(id),
    )
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
