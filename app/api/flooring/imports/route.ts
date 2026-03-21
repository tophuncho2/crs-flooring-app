import { prisma } from "@/server/db/prisma"
import { createImportEntry, listImportEntries, normalizeImportEntry } from "@/features/flooring/imports/api"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  requireRouteAccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  try {
    return routeJson(access, { imports: await listImportEntries(prisma) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
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
    const created = await createImportEntry(prisma, body)
    const normalized = normalizeImportEntry(created)
    logRouteMutationSuccess(access, {
      message: "Import created",
      action: "imports.create",
      route: "/api/flooring/imports",
      entityType: "flooringImportEntry",
      entityId: normalized.id,
      details: {
        importNumber: normalized.importNumber,
        itemsCount: normalized.itemsCount,
      },
    })

    return routeJson(access, { import: normalized }, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Import creation failed",
        action: "imports.create.error",
        route: "/api/flooring/imports",
        entityType: "flooringImportEntry",
      },
      error,
    )
    return routeError(access, error)
  }
}
