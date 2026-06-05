"use client"

import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  toInventoryForm,
  type InventoryDetail,
  type InventoryForm,
} from "@builders/domain"
import {
  deleteInventoryRequest,
  updateInventoryRequest,
} from "@/modules/inventory/data/mutations"

/**
 * Primary section of the inventory record view. Mirrors `useMcPrimarySection`:
 * built on the shared `useSingleSectionRecordController`, it maps the inventory
 * detail to the canonical `InventoryForm` and saves via the primary-section
 * PATCH. Only `location` / `internalNotes` / `isArchived` ever change in the UI;
 * the rest of the form carries the snapshot values forward unchanged (the
 * server's `UpdateInventoryInput` treats every field as optional).
 */
export function useInventoryPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: InventoryDetail
}) {
  return useSingleSectionRecordController<InventoryDetail, InventoryForm>({
    page,
    scope: "inventory",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/inventory/${entry.id}`,
    payloadKey: "inventory",
    createLocalValue: toInventoryForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const { inventory } = await updateInventoryRequest(record.id, localValue, record.updatedAt)
      return {
        serverValue: inventory as InventoryDetail,
        noticeMessage: "Inventory saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteInventoryRequest(record.id, record.updatedAt)
    },
    deleteErrorMessage: "Failed to delete inventory",
  })
}
