import { updateWorkOrderDocumentTypeUseCase } from "@builders/application"
import { getWorkOrderDocumentTypeById } from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { validateUpdateWorkOrderDocumentTypeInput } from "../../../_validators"

export const PATCH = createMutationRoute({
  scope: "workOrderDocumentTypes.primary.section.replace",
  route: "/api/work-order-document-types/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateUpdateWorkOrderDocumentTypeInput,
  concurrency: {
    loadSnapshot: ({ params }) => getWorkOrderDocumentTypeById(params.id),
    snapshotKey: "workOrderDocumentType",
    message: "Document type changed before section save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) =>
    updateWorkOrderDocumentTypeUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "workOrderDocumentTypes.primary.section.replace",
    message: "Work order document type primary section replaced",
    entityType: "flooringWorkOrderDocumentType",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: ({ result }) => ({ workOrderDocumentType: result }),
})
