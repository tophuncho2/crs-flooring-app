import { updateCertificateUseCase } from "@builders/application"
import { getCertificateById } from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateUpdateCertificateInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "certificates.primary.section.replace",
  route: "/api/certificates/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateUpdateCertificateInput,
  concurrency: {
    loadSnapshot: ({ params }) => getCertificateById(params.id),
    snapshotKey: "certificate",
    message: "Certificate changed before section save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) => updateCertificateUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "certificates.primary.section.replace",
    message: "Certificate primary section replaced",
    entityType: "certificate",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: ({ result }) => ({ certificate: result }),
})
