"use client"

import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import type { WarehouseForm } from "@builders/domain"
import { toWarehouseForm, type WarehouseDetail } from "@/modules/warehouse/types"
import { deleteWarehouseRequest, updateWarehouseRequest } from "@/modules/warehouse/data/mutations"

export function useWarehousePrimarySection({
  page,
  warehouse,
}: {
  page: RecordDetailClientScaffoldContext
  warehouse: WarehouseDetail
}) {
  return useSingleSectionRecordController<WarehouseDetail, WarehouseForm>({
    page,
    scope: "warehouse",
    id: warehouse.id,
    initialRecord: warehouse,
    detailUrl: `/api/warehouses/${warehouse.id}`,
    payloadKey: "warehouse",
    createLocalValue: toWarehouseForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record, revisionKey }) => {
      if (!localValue.name.trim()) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Warehouse name is required.",
          retryable: true,
        })
      }

      const { warehouse: updated } = await updateWarehouseRequest(record.id, localValue, revisionKey)

      return {
        serverValue: {
          ...record,
          name: updated.name,
          address: updated.address,
          phone: updated.phone,
          updatedAt: updated.updatedAt,
        },
        noticeMessage: "Warehouse saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteWarehouseRequest(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete warehouse",
  })
}
