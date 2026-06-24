"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toEntityTypeForm,
  validateEntityTypeForm,
  type EntityType,
  type EntityTypeForm,
} from "@builders/domain"
import {
  deleteEntityTypeRequest,
  updateEntityTypeRequest,
} from "@/modules/entity-types/data/mutations"
import { ENTITY_TYPES_LIST_QUERY_KEY } from "@/modules/entity-types/data/list-entity-types-request"

export function useEntityTypePrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: EntityType
}) {
  const queryClient = useQueryClient()

  return useSingleSectionRecordController<EntityType, EntityTypeForm>({
    page,
    scope: "entity-types",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/entity-types/${entry.id}`,
    payloadKey: "entityType",
    createLocalValue: toEntityTypeForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateEntityTypeForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }
      const { entityType } = await updateEntityTypeRequest(record.id, localValue, record.updatedAt)
      return {
        serverValue: entityType,
        noticeMessage: "Entity type saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteEntityTypeRequest(record.id, record.updatedAt)
      await queryClient.invalidateQueries({ queryKey: ENTITY_TYPES_LIST_QUERY_KEY })
    },
    deleteErrorMessage: "Failed to delete entity type",
  })
}
