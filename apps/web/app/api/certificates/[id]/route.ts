import { deleteCertificateUseCase } from "@builders/application"
import { getCertificateById } from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { parseUuidParam } from "@/server/http/api-helpers"
import { getStorageEnvironment } from "@/server/platform/env"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/certificates/[id]",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: async ({ params }) => getCertificateById(params.id),
  buildResponseBody: ({ result }) => ({ certificate: result }),
})

export const DELETE = createMutationRoute({
  scope: "certificates.delete",
  route: "/api/certificates/[id]",
  rateLimit: CRUD_DELETE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: ({ params }) => getCertificateById(params.id),
    snapshotKey: "certificate",
    message: "Certificate changed before delete completed. Refresh and try again.",
  },
  useCase: ({ params }) => deleteCertificateUseCase(params.id, getStorageEnvironment()),
  telemetry: ({ params }) => ({
    action: "certificates.delete",
    message: "Certificate deleted",
    entityType: "certificate",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
