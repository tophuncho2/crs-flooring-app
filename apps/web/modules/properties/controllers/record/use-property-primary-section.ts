"use client"

import { useQueryClient } from "@tanstack/react-query"
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
import {
  deletePropertyRequest,
  updatePropertyRequest,
} from "@/modules/properties/data/property-mutations"
import { PROPERTIES_LIST_QUERY_KEY } from "@/modules/properties/data/list-properties-request"
import { ENTITIES_LIST_QUERY_KEY } from "@/modules/entities/data/list-entities-request"

export function usePropertyPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: PropertyDetailRecord
}) {
  const queryClient = useQueryClient()

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
      // Refresh the properties list (and the entity list's property counts) so the
      // deleted property doesn't linger from cache.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PROPERTIES_LIST_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ENTITIES_LIST_QUERY_KEY }),
      ])
    },
    deleteErrorMessage: "Failed to delete property",
  })
}
