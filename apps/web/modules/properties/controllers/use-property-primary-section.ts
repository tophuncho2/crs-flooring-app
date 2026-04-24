"use client"

import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  deletePropertyRequest,
  updatePropertyRequest,
} from "@/modules/properties/data/mutations"
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
    saveSection: async ({ localValue, record, revisionKey }) => {
      const validationError = validatePropertyPrimaryForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await updatePropertyRequest(record.id, localValue, revisionKey)

      return {
        serverValue: payload.property,
        noticeMessage: "Property saved",
      }
    },
    deleteRecord: async (record) => {
      await deletePropertyRequest(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete property",
  })
}
