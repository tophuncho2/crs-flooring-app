"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import {
  toWarehouseDraft,
  type WarehouseDetail,
  type WarehouseDraft,
} from "../../../types"

export function useWarehousePrimarySection({
  page,
  warehouse,
}: {
  page: RecordDetailClientScaffoldContext
  warehouse: WarehouseDetail
}) {
  return useSingleSectionRecordController<WarehouseDetail, WarehouseDraft>({
    page,
    scope: "warehouse",
    id: warehouse.id,
    initialRecord: warehouse,
    detailUrl: `/api/flooring/warehouses/${warehouse.id}`,
    payloadKey: "warehouse",
    createLocalValue: toWarehouseDraft,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      if (!localValue.name.trim()) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Warehouse name is required.",
          retryable: true,
        })
      }

      const payload = await requestJson<{ warehouse: WarehouseDetail }>(`/api/flooring/warehouses/${record.id}`, {
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
