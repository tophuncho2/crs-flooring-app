"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  toPropertyPrimaryForm,
  validatePropertyPrimaryForm,
  type PropertyDetailRecord,
  type PropertyPrimaryForm,
} from "@builders/domain"

export function usePropertyPrimarySection({
  page,
  property,
}: {
  page: RecordDetailClientScaffoldContext
  property: PropertyDetailRecord
}) {
  return useSingleSectionRecordController<PropertyDetailRecord, PropertyPrimaryForm>({
    page,
    scope: "property",
    id: property.id,
    initialRecord: property,
    detailUrl: `/api/properties/${property.id}`,
    payloadKey: "property",
    createLocalValue: toPropertyPrimaryForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validatePropertyPrimaryForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await requestJson<{ property: PropertyDetailRecord }>(
        `/api/properties/${record.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(localValue),
        },
      )

      return {
        serverValue: payload.property,
        noticeMessage: "Property saved",
      }
    },
    deleteRecord: async (record) => {
      await requestJson<{ ok: true }>(`/api/properties/${record.id}`, {
        method: "DELETE",
      })
    },
    deleteErrorMessage: "Failed to delete property",
  })
}
