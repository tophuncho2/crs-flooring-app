"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toWorkOrderDocumentTypeForm,
  validateWorkOrderDocumentTypeForm,
  type WorkOrderDocumentType,
  type WorkOrderDocumentTypeForm,
} from "@builders/domain"
import {
  deleteWorkOrderDocumentTypeRequest,
  updateWorkOrderDocumentTypeRequest,
} from "@/modules/work-order-document-types/data/mutations"
import { WORK_ORDER_DOCUMENT_TYPES_LIST_QUERY_KEY } from "@/modules/work-order-document-types/data/list-work-order-document-types-request"

export function useWorkOrderDocumentTypePrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: WorkOrderDocumentType
}) {
  const queryClient = useQueryClient()

  return useSingleSectionRecordController<WorkOrderDocumentType, WorkOrderDocumentTypeForm>({
    page,
    scope: "work-order-document-types",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/work-order-document-types/${entry.id}`,
    payloadKey: "workOrderDocumentType",
    createLocalValue: toWorkOrderDocumentTypeForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateWorkOrderDocumentTypeForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }
      const { workOrderDocumentType } = await updateWorkOrderDocumentTypeRequest(
        record.id,
        localValue,
        record.updatedAt,
      )
      return {
        serverValue: workOrderDocumentType,
        noticeMessage: "Document type saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteWorkOrderDocumentTypeRequest(record.id, record.updatedAt)
      await queryClient.invalidateQueries({ queryKey: WORK_ORDER_DOCUMENT_TYPES_LIST_QUERY_KEY })
    },
    deleteErrorMessage: "Failed to delete document type",
  })
}
