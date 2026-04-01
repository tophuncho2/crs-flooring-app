"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  toServiceForm,
  validateServiceForm,
  type ServiceForm,
  type ServiceRow,
} from "../../../domain/types"

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
    saveSection: async ({ localValue, record }) => {
      const validationError = validateServiceForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await requestJson<{ service: ServiceRow }>(`/api/services/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localValue),
      })

      return {
        serverValue: payload.service,
        noticeMessage: "Service saved",
      }
    },
    deleteRecord: async (record) => {
      await requestJson<{ ok: true }>(`/api/services/${record.id}`, {
        method: "DELETE",
      })
    },
    deleteErrorMessage: "Failed to delete service",
  })
}
