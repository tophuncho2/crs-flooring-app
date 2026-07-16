import {
  createWorkOrderDocumentTypeUseCase,
  listWorkOrderDocumentTypesUseCase,
} from "@builders/application"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import {
  validateCreateWorkOrderDocumentTypeInput,
  validateListWorkOrderDocumentTypesQuery,
} from "./_validators"

export const GET = createQueryRoute({
  route: "/api/work-order-document-types",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: (searchParams) => validateListWorkOrderDocumentTypesQuery(searchParams),
  useCase: ({ input }) => listWorkOrderDocumentTypesUseCase(input),
})

export const POST = createMutationRoute({
  scope: "workOrderDocumentTypes.create",
  route: "/api/work-order-document-types",
  rateLimit: CRUD_CREATE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseInput: validateCreateWorkOrderDocumentTypeInput,
  useCase: ({ input, access }) =>
    createWorkOrderDocumentTypeUseCase(input, access.user.email),
  telemetry: {
    action: "workOrderDocumentTypes.create",
    message: "Work order document type created",
    entityType: "flooringWorkOrderDocumentType",
  },
  status: 201,
  buildResponseBody: ({ result }) => ({ workOrderDocumentType: result }),
})
