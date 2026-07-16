import {
  deleteWorkOrderDocumentTypeUseCase,
  WorkOrderDocumentTypeExecutionError,
} from "@builders/application"
import { getWorkOrderDocumentTypeById, getWorkOrderDocumentTypeDetailById } from "@builders/db"
import { ELEVATED_MODULE_MIN_RANK, WORK_ORDER_DOCUMENT_TYPE_NOT_FOUND_MESSAGE } from "@builders/domain"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/work-order-document-types/[id]",
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: () => ({}),
  useCase: async ({ params }) => {
    const documentType = await getWorkOrderDocumentTypeDetailById(params.id, {
      withNeighbors: true,
    })
    if (!documentType) {
      throw new WorkOrderDocumentTypeExecutionError({
        code: "WORK_ORDER_DOCUMENT_TYPE_NOT_FOUND",
        message: WORK_ORDER_DOCUMENT_TYPE_NOT_FOUND_MESSAGE,
        status: 404,
      })
    }
    return documentType
  },
  buildResponseBody: ({ result }) => ({ workOrderDocumentType: result }),
})

export const DELETE = createMutationRoute({
  scope: "workOrderDocumentTypes.delete",
  route: "/api/work-order-document-types/[id]",
  rateLimit: CRUD_DELETE,
  minRank: ELEVATED_MODULE_MIN_RANK,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: ({ params }) => getWorkOrderDocumentTypeById(params.id),
    snapshotKey: "workOrderDocumentType",
    message: "Document type changed before delete completed. Refresh and try again.",
  },
  useCase: ({ params }) => deleteWorkOrderDocumentTypeUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "workOrderDocumentTypes.delete",
    message: "Work order document type deleted",
    entityType: "flooringWorkOrderDocumentType",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
