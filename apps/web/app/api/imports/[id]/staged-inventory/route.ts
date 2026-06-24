import { listFilterRowsByImport, listStagedInventoryByImport } from "@builders/db"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * Read-only rows snapshot for an import's staged-inventory section. Powers the
 * client queued→imported poll: the worker flips staged rows QUEUED → IMPORTED
 * in the DB without stamping the parent, so the record controller re-reads this
 * until no row is QUEUED. Composes the same canonical reads the SSR loader uses
 * (`getImportDetailPageData`); no mutation gauntlet.
 */
export async function GET(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/imports/[id]/staged-inventory",
  )
  if (rateLimited) return rateLimited

  try {
    const { id } = await context.params
    const [filterRows, stagedRows] = await Promise.all([
      listFilterRowsByImport(id),
      listStagedInventoryByImport(id),
    ])
    return routeJson(access, { filterRows, stagedRows })
  } catch (error) {
    return routeError(access, error)
  }
}
