import { prisma } from "@/server/db/prisma"
import {
  normalizeImportEntry,
  removeImportEntryIfEmpty,
  updateImportEntry,
} from "@/features/flooring/imports/api"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  requireRouteAccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "imports.write",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/imports/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const entry = await updateImportEntry(prisma, id, body)
    const normalized = normalizeImportEntry(entry)
    logRouteMutationSuccess(access, {
      message: "Import updated",
      action: "imports.update",
      route: "/api/flooring/imports/[id]",
      entityType: "flooringImportEntry",
      entityId: normalized.id,
      details: {
        importNumber: normalized.importNumber,
        itemsCount: normalized.itemsCount,
      },
    })

    return routeJson(access, { import: normalized })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Import update failed",
        action: "imports.update.error",
        route: "/api/flooring/imports/[id]",
        entityType: "flooringImportEntry",
      },
      error,
    )
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "imports.delete",
    limit: 30,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/imports/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    await removeImportEntryIfEmpty(prisma, id)
    logRouteMutationSuccess(access, {
      message: "Import deleted",
      action: "imports.delete",
      route: "/api/flooring/imports/[id]",
      entityType: "flooringImportEntry",
      entityId: id,
    })
    return routeJson(access, { ok: true })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Import deletion failed",
        action: "imports.delete.error",
        route: "/api/flooring/imports/[id]",
        entityType: "flooringImportEntry",
        entityId: (await context.params).id,
      },
      error,
    )
    return routeError(access, error)
  }
}
