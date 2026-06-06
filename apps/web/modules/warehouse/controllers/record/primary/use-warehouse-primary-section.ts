"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toWarehouseForm,
  type WarehouseForm,
  type WarehouseRow,
} from "@builders/domain"
import { deleteWarehouseRequest, updateWarehouseRequest } from "@/modules/warehouse/data/mutations"
import { WAREHOUSE_LIST_QUERY_KEY } from "@/modules/warehouse/data/list-warehouse-request"

export function useWarehousePrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: WarehouseRow
}) {
  const queryClient = useQueryClient()

  return useSingleSectionRecordController<WarehouseRow, WarehouseForm>({
    page,
    scope: "warehouses",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/warehouses/${entry.id}`,
    payloadKey: "warehouse",
    createLocalValue: toWarehouseForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      if (!localValue.name.trim()) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Warehouse name is required.",
          retryable: true,
        })
      }
      const { warehouse } = await updateWarehouseRequest(record.id, localValue, record.updatedAt)
      return {
        serverValue: warehouse,
        noticeMessage: "Warehouse saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteWarehouseRequest(record.id, record.updatedAt)
      await queryClient.invalidateQueries({ queryKey: [...WAREHOUSE_LIST_QUERY_KEY] })
    },
    deleteErrorMessage: "Failed to delete warehouse",
  })
}
