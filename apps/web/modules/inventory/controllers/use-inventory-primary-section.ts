"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  toInventoryForm,
  type InventoryDetail,
  type InventoryForm,
} from "@builders/domain"

export function useInventoryPrimarySection({
  page,
  inventory,
}: {
  page: RecordDetailClientScaffoldContext
  inventory: InventoryDetail
}) {
  const controller = useSingleSectionRecordController<InventoryDetail, InventoryForm>({
    page,
    scope: "inventory",
    id: inventory.id,
    initialRecord: inventory,
    detailUrl: `/api/inventory/${inventory.id}`,
    payloadKey: "inventory",
    createLocalValue: toInventoryForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const payload = await requestJson<{ inventory: InventoryDetail }>(
        `/api/inventory/${record.id}/primary/section`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withMutationMeta(localValue, record.updatedAt)),
        },
      )

      return {
        serverValue: payload.inventory,
        noticeMessage: "Inventory saved",
      }
    },
    deleteRecord: async (record) => {
      await requestJson<{ ok: true }>(`/api/inventory/${record.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withMutationMeta({}, record.updatedAt)),
      })
    },
    deleteErrorMessage: "Failed to delete inventory",
  })

  return controller
}
