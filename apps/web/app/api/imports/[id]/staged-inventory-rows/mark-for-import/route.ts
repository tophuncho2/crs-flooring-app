import { markStagedRowsForImportUseCase } from "@builders/application"
import { getImportDetailById } from "@builders/db"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateMarkForImportBody } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "imports.staged-inventory-rows.mark-for-import",
      route: "/api/imports/[id]/staged-inventory-rows/mark-for-import",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateMarkForImportBody)

    const receipt = await enforceMutationReceipt({
      scope: "imports.staged-inventory-rows.mark-for-import",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const requestedBy = { userId: access.user.id, userEmail: access.user.email }

    const result = await withMutationTelemetry(
      access,
      {
        message: "Staged inventory rows marked for import",
        action: "imports.staged-inventory-rows.mark-for-import",
        route: "/api/imports/[id]/staged-inventory-rows/mark-for-import",
        entityType: "flooringImportEntry",
        entityId: id,
      },
      () => markStagedRowsForImportUseCase(id, input.stagedRowIds, requestedBy),
    )

    // Marking stamps the parent import (aggregate-root actor), bumping its
    // updatedAt/updatedBy. Return the fresh detail so the client can resync the
    // shared record's OCC token — otherwise the next section/primary save 409s.
    const detail = await getImportDetailById(id)
    const responseBody = { batch: result, import: detail }
    await finalizeMutationReceipt({
      scope: "imports.staged-inventory-rows.mark-for-import",
      access,
      mutation,
      responseStatus: 202,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 202 })
  } catch (error) {
    return routeError(access, error)
  }
}
