import { getImportById, getImportDetailById, listStagedInventoryByImport } from "@builders/db"
import { ImportExecutionError, saveStagedInventoryRowsUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateStagedInventoryRowsDiffBody } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "imports.staged-inventory-rows.section.replace",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/imports/[id]/staged-inventory-rows/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input: diff, mutation } = parseMutationEnvelope(body, validateStagedInventoryRowsDiffBody, {
      requireExpectedUpdatedAt: true,
    })

    const currentSnapshot = await getImportById(id)
    if (!currentSnapshot) {
      throw new ImportExecutionError({
        code: "IMPORT_NOT_FOUND",
        message: "Import not found.",
        status: 404,
      })
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { import: currentSnapshot },
      message: "Import changed before save completed. Refresh and try again.",
    })

    const receipt = await enforceMutationReceipt({
      scope: "imports.staged-inventory-rows.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Import staged inventory rows saved",
        action: "imports.staged-inventory-rows.section.replace",
        route: "/api/imports/[id]/staged-inventory-rows/section",
        entityType: "flooringImportEntry",
        entityId: id,
      },
      () => saveStagedInventoryRowsUseCase(id, diff),
    )

    // Compose the parent detail + fresh staged-row contents so the controller
    // can reconcile in one round-trip. ImportDetail only carries {id} pointers
    // for staged rows now — the section route is the natural place to re-read
    // the full row payloads after the diff applies.
    const [detail, stagedRows] = await Promise.all([
      getImportDetailById(id),
      listStagedInventoryByImport(id),
    ])
    const responseBody = { import: detail, stagedRows, tempIdMap: result.tempIdMap }
    await finalizeMutationReceipt({
      scope: "imports.staged-inventory-rows.section.replace",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
