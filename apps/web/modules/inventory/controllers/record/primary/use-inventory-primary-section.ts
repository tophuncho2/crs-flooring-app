"use client"

import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  toInventoryForm,
  type InventoryDetail,
  type InventoryForm,
} from "@builders/domain"
import { useInventoryListMutations } from "@/modules/inventory/controllers/list/use-inventory-list-mutations"

export function useInventoryPrimarySection({
  page,
  inventory,
}: {
  page: RecordDetailClientScaffoldContext
  inventory: InventoryDetail
}) {
  const { updateInventory, deleteInventory } = useInventoryListMutations()

  return useSingleSectionRecordController<InventoryDetail, InventoryForm>({
    page,
    scope: "inventory",
    id: inventory.id,
    initialRecord: inventory,
    detailUrl: `/api/inventory/${inventory.id}`,
    payloadKey: "inventory",
    createLocalValue: toInventoryForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const payload = await updateInventory.mutateAsync({
        id: record.id,
        input: localValue,
        revisionKey: record.updatedAt,
      })
      return {
        serverValue: payload.inventory,
        noticeMessage: "Inventory saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteInventory.mutateAsync({ id: record.id, updatedAt: record.updatedAt })
    },
    deleteErrorMessage: "Failed to delete inventory",
  })
}
