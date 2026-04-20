"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { toWarehouseForm, type WarehouseForm } from "@builders/domain"
import type { WarehouseDetail } from "@/modules/warehouse/types"

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
    saveSection: async ({ localValue, record }) => {
      if (!localValue.name.trim()) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Warehouse name is required.",
          retryable: true,
        })
      }

      const payload = await requestJson<{ warehouse: WarehouseDetail }>(`/api/warehouses/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localValue),
      })

      return {
        serverValue: payload.warehouse,
        noticeMessage: "Warehouse saved",
      }
    },
  })
}
