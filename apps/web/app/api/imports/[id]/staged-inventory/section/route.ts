import {
  ImportExecutionError,
  saveImportStagedInventorySectionUseCase,
} from "@builders/application"
import { getImportById, getImportDetailById } from "@builders/db"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateImportStagedInventorySectionDiffBody } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "imports.staged-inventory.section.replace",
  route: "/api/imports/[id]/staged-inventory/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => raw as { id: string },
  parseInput: validateImportStagedInventorySectionDiffBody,
  concurrency: {
    loadSnapshot: async ({ params }) => {
      const snapshot = await getImportById(params.id)
      if (!snapshot) {
        throw new ImportExecutionError({
          code: "IMPORT_NOT_FOUND",
          message: "Import not found.",
          status: 404,
        })
      }
      return snapshot
    },
    snapshotKey: "import",
    message: "Import changed before save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) =>
    saveImportStagedInventorySectionUseCase({ importEntryId: params.id, diff: input }, access.user.email),
  telemetry: ({ params }) => ({
    action: "imports.staged-inventory.section.replace",
    message: "Import staged-inventory section replaced",
    entityType: "flooringImportEntry",
    entityId: params.id,
  }),
  status: 200,
  // Refresh parent detail post-save so the controller can reconcile the
  // import's `updatedAt` (and any other denormalized fields) alongside
  // the section's own results.
  buildResponseBody: async ({ result, params }) => {
    const detail = await getImportDetailById(params.id)
    return {
      import: detail,
      filterRows: result.filterRows,
      stagedRows: result.stagedRows,
      filterTempIdMap: result.filterTempIdMap,
      rowTempIdMap: result.rowTempIdMap,
    }
  },
})
