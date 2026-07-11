import { getImportDetailById } from "@builders/db"
import { ImportExecutionError, deleteImportUseCase } from "@builders/application"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/imports/[id]",
  parseParams: async (raw) => ({ id: (raw as { id: string }).id }),
  parseInput: () => ({}),
  useCase: ({ params }) => getImportDetailById(params.id),
  buildResponseBody: ({ result }) => ({ import: result }),
})

export const DELETE = createMutationRoute({
  scope: "imports.delete",
  route: "/api/imports/[id]",
  rateLimit: CRUD_DELETE,
  parseParams: async (raw) => raw as { id: string },
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: async ({ params }) => {
      const snapshot = await getImportDetailById(params.id, { withNeighbors: false })
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
  useCase: ({ params }) => deleteImportUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "imports.delete",
    message: "Import deleted",
    entityType: "flooringImportEntry",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true }),
})
