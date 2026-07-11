import { getImportById, getImportDetailById } from "@builders/db"
import { ImportExecutionError, updateImportUseCase } from "@builders/application"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateUpdateImportInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "imports.primary.section.replace",
  route: "/api/imports/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => raw as { id: string },
  parseInput: validateUpdateImportInput,
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
  useCase: ({ input, access, params }) => updateImportUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "imports.primary.section.replace",
    message: "Import primary section updated",
    entityType: "flooringImportEntry",
    entityId: params.id,
  }),
  status: 200,
  // Client controller expects ImportDetailRecord (row + id-pointer arrays for
  // staged + live inventory) so the record view's section reconciliation
  // stays consistent. Use case returns the flat row; compose the detail at
  // the route boundary — mirrors the inventory primary section route pattern.
  buildResponseBody: async ({ result, params }) => {
    const detail = (await getImportDetailById(params.id)) ?? result
    return { import: detail }
  },
})
