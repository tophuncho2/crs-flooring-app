import { createCertificateUseCase, listCertificatesUseCase } from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import { validateCreateCertificateInput, validateListCertificatesQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/certificates",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: (searchParams) => validateListCertificatesQuery(searchParams),
  useCase: ({ input }) => listCertificatesUseCase(input),
})

export const POST = createMutationRoute({
  scope: "certificates.create",
  route: "/api/certificates",
  rateLimit: CRUD_CREATE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: validateCreateCertificateInput,
  useCase: ({ input, access }) => createCertificateUseCase(input, access.user.email),
  telemetry: { action: "certificates.create", message: "Certificate created", entityType: "certificate" },
  status: 201,
  buildResponseBody: ({ result }) => ({ certificate: result }),
})
