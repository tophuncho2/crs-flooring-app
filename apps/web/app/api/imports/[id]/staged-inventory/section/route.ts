import {
  ImportExecutionError,
  saveImportStagedInventorySectionUseCase,
} from "@builders/application"
import { getImportById, getImportDetailById } from "@builders/db"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateImportStagedInventorySectionDiffBody } from "../../../_validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "warehouse",
    rateLimit: {
      scope: "imports.staged-inventory.section.replace",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/imports/[id]/staged-inventory/section",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const { input: diff, mutation } = parseMutationEnvelope(
      body,
      validateImportStagedInventorySectionDiffBody,
      { requireExpectedUpdatedAt: true },
    )

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
      scope: "imports.staged-inventory.section.replace",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Import staged-inventory section replaced",
        action: "imports.staged-inventory.section.replace",
        route: "/api/imports/[id]/staged-inventory/section",
        entityType: "flooringImportEntry",
        entityId: id,
      },
      () => saveImportStagedInventorySectionUseCase({ importEntryId: id, diff }),
    )

    // Refresh parent detail post-save so the controller can reconcile the
    // import's `updatedAt` (and any other denormalized fields) alongside
    // the section's own results.
    const detail = await getImportDetailById(id)
    const responseBody = {
      import: detail,
      filterRows: result.filterRows,
      stagedRows: result.stagedRows,
      filterTempIdMap: result.filterTempIdMap,
      rowTempIdMap: result.rowTempIdMap,
    }
    await finalizeMutationReceipt({
      scope: "imports.staged-inventory.section.replace",
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
