"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
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
    detailUrl: `/api/flooring/services/${service.id}`,
    payloadKey: "service",
    createLocalValue: toServiceForm,
    saveSection: async ({ localValue, record }) => {
      page.notices.clearNotices()
      const validationError = validateServiceForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await requestJson<{ service: ServiceRow }>(`/api/flooring/services/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localValue),
      })

      page.notices.showSuccess("Service saved")
      return payload.service
    },
    deleteRecord: async (record) => {
      page.notices.clearNotices()
      await requestJson<{ ok: true }>(`/api/flooring/services/${record.id}`, {
        method: "DELETE",
      })
    },
    deleteErrorMessage: "Failed to delete service",
  })
}
