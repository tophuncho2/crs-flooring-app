import {
  getImportEntryById,
} from "@/modules/imports/api"
import { deleteImportEntryUseCase, updateImportEntryUseCase } from "@/modules/imports/application/import-entry"
import { authorizeWarehouseRoute } from "@/modules/shared/access/domain-tools"
import {
  enforceRouteRateLimit,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    return routeJson(access, { import: await getImportEntryById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "imports.write",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    route: "/api/imports/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const normalized = await withMutationTelemetry(
      access,
      {
        message: "Import updated",
        action: "imports.update",
        route: "/api/imports/[id]",
        entityType: "flooringImportEntry",
        entityId: id,
      },
      () => updateImportEntryUseCase(id, body),
    )
    return routeJson(access, { import: normalized })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "imports.delete",
    limit: 30,
    windowMs: 10 * 60 * 1000,
    route: "/api/imports/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    await withMutationTelemetry(
      access,
      {
        message: "Import deleted",
        action: "imports.delete",
        route: "/api/imports/[id]",
        entityType: "flooringImportEntry",
        entityId: id,
      },
      () => deleteImportEntryUseCase(id),
    )
    return routeJson(access, { ok: true })
  } catch (error) {
    return routeError(access, error)
  }
}
