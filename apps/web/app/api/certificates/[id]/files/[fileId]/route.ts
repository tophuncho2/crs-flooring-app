import { deleteCertificateFileUseCase } from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { parseUuidParam } from "@/server/http/api-helpers"
import { getStorageEnvironment } from "@/server/platform/env"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"

// DELETE /api/certificates/[id]/files/[fileId]
//
// Per-row sync delete. JSON envelope (idempotency key only — no `expectedUpdatedAt`
// since a file carries no OCC token and its removal is idempotent). Deletes the
// row then best-effort deletes the S3 object.
export const DELETE = createMutationRoute({
  scope: "certificates.files.delete",
  route: "/api/certificates/[id]/files/[fileId]",
  rateLimit: CRUD_DELETE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({
    certificateId: parseUuidParam((raw as { id: string; fileId: string }).id, "id"),
    fileId: parseUuidParam((raw as { id: string; fileId: string }).fileId, "fileId"),
  }),
  parseInput: (value) => value,
  useCase: ({ params }) =>
    deleteCertificateFileUseCase({
      certificateId: params.certificateId,
      fileId: params.fileId,
      storage: getStorageEnvironment(),
    }),
  telemetry: ({ params }) => ({
    action: "certificates.files.delete",
    message: "Certificate file deleted",
    entityType: "certificateFile",
    entityId: params.fileId,
  }),
  status: 200,
  buildResponseBody: ({ result }) => result as Record<string, unknown>,
})
