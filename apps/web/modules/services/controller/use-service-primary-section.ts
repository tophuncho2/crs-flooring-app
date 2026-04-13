"use client"

import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { updateServiceRequest, deleteServiceRequest } from "@/modules/services/data/mutations"
import {
  toServiceForm,
  validateServiceForm,
  type ServiceForm,
  type ServiceRow,
} from "@builders/domain"

export function useServicePrimarySection({
  page,
  service,
}: {
  page: RecordDetailClientScaffoldContext
  service: ServiceRow
}) {
  return useSingleSectionRecordController<ServiceRow, ServiceForm>({
    page,
    scope: "service",
    id: service.id,
    initialRecord: service,
    detailUrl: `/api/services/${service.id}`,
    payloadKey: "service",
    createLocalValue: toServiceForm,
    saveSection: async ({ localValue, record, revisionKey }) => {
      const validationError = validateServiceForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await updateServiceRequest(record.id, localValue, revisionKey)

      return {
        serverValue: payload.service,
        noticeMessage: "Service saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteServiceRequest(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete service",
  })
}
