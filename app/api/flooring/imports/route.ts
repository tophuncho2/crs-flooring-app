import { prisma } from "@/server/db/prisma"
import { listImportEntries } from "@/features/flooring/imports/api"
import { createImportEntryUseCase } from "@/features/flooring/imports/application/import-entry"
import { authorizeWarehouseRoute } from "@/features/flooring/shared/access/domain-tools"
import {
  enforceRouteRateLimit,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"

export async function GET(request: Request) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  try {
    return routeJson(access, { imports: await listImportEntries(prisma) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "imports.write",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/imports",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await request.json()) as Record<string, unknown>
    const normalized = await withMutationTelemetry(
      access,
      {
        message: "Import created",
        action: "imports.create",
        route: "/api/flooring/imports",
        entityType: "flooringImportEntry",
      },
      () => createImportEntryUseCase(body),
    )
    return routeJson(access, { import: normalized }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
