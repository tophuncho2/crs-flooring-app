import { markStagedRowsForImportUseCase } from "@builders/application"
import { getImportDetailById } from "@builders/db"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateMarkForImportBody } from "../../../_validators"

export const POST = createMutationRoute({
  scope: "imports.staged-inventory-rows.mark-for-import",
  route: "/api/imports/[id]/staged-inventory-rows/mark-for-import",
  rateLimit: CRUD_CREATE,
  parseParams: async (raw) => raw as { id: string },
  parseInput: validateMarkForImportBody,
  useCase: ({ input, access, params }) =>
    markStagedRowsForImportUseCase(params.id, input.stagedRowIds, {
      userId: access.user.id,
      userEmail: access.user.email,
    }),
  telemetry: ({ params }) => ({
    message: "Staged inventory rows marked for import",
    action: "imports.staged-inventory-rows.mark-for-import",
    entityType: "flooringImportEntry",
    entityId: params.id,
  }),
  status: 202,
  // Marking stamps the parent import (aggregate-root actor), bumping its
  // updatedAt/updatedBy. Return the fresh detail so the client can resync the
  // shared record's OCC token — otherwise the next section/primary save 409s.
  buildResponseBody: async ({ result, params }) => ({
    batch: result,
    import: await getImportDetailById(params.id),
  }),
})
