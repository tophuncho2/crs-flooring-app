"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toManufacturerForm,
  type ManufacturerForm,
  type ManufacturerRow,
} from "@builders/domain"
import {
  deleteManufacturerRequest,
  updateManufacturerRequest,
} from "@/modules/manufacturers/data/mutations"
import { MANUFACTURERS_LIST_QUERY_KEY } from "@/modules/manufacturers/data/list-manufacturers-request"

export function useManufacturerPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: ManufacturerRow
}) {
  const queryClient = useQueryClient()

  return useSingleSectionRecordController<ManufacturerRow, ManufacturerForm>({
    page,
    scope: "manufacturers",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/manufacturers/${entry.id}`,
    payloadKey: "manufacturer",
    createLocalValue: toManufacturerForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      if (!localValue.companyName.trim() && !localValue.agentName.trim()) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Enter a company name or agent name.",
          retryable: true,
        })
      }
      const { manufacturer } = await updateManufacturerRequest(
        record.id,
        localValue,
        record.updatedAt,
      )
      return {
        serverValue: manufacturer,
        noticeMessage: "Manufacturer saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteManufacturerRequest(record.id, record.updatedAt)
      await queryClient.invalidateQueries({ queryKey: [...MANUFACTURERS_LIST_QUERY_KEY] })
    },
    deleteErrorMessage: "Failed to delete manufacturer",
  })
}
