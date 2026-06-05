"use client"

import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toPropertyPrimaryForm,
  validatePropertyPrimaryForm,
  type PropertyDetailRecord,
  type PropertyPrimaryForm,
} from "@builders/domain"
import { deletePropertyRequest, updatePropertyRequest } from "@/modules/properties/data/mutations"

export function usePropertyPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: PropertyDetailRecord
}) {
  return useSingleSectionRecordController<PropertyDetailRecord, PropertyPrimaryForm>({
    page,
    scope: "properties",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/properties/${entry.id}`,
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
      const { property } = await updatePropertyRequest(record.id, localValue, record.updatedAt)
      return {
        serverValue: property,
        noticeMessage: "Property saved",
      }
    },
    deleteRecord: async (record) => {
      await deletePropertyRequest(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete property",
  })
}
