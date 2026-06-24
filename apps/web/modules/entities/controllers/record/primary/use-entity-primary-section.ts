"use client"

import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toEntityForm,
  validateEntityForm,
  type EntityDetail,
  type EntityForm,
} from "@builders/domain"
import {
  deleteEntityRequest,
  updateEntityRequest,
} from "@/modules/entities/data/mutations"

export function useEntityPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: EntityDetail
}) {
  return useSingleSectionRecordController<EntityDetail, EntityForm>({
    page,
    scope: "entities",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/entities/${entry.id}`,
    payloadKey: "entity",
    createLocalValue: toEntityForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateEntityForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }
      const { entity } = await updateEntityRequest(
        record.id,
        localValue,
        record.updatedAt,
      )
      return {
        serverValue: entity,
        noticeMessage: "Entity saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteEntityRequest(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete entity",
  })
}
