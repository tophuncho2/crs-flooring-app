"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toInventoryAgeIndicatorForm,
  validateInventoryAgeIndicatorForm,
  type InventoryAgeIndicator,
  type InventoryAgeIndicatorForm,
} from "@builders/domain"
import {
  deleteInventoryAgeIndicatorRequest,
  updateInventoryAgeIndicatorRequest,
} from "@/modules/inventory-age-indicators/data/mutations"
import { INVENTORY_AGE_INDICATORS_LIST_QUERY_KEY } from "@/modules/inventory-age-indicators/data/list-inventory-age-indicators-request"

export function useInventoryAgeIndicatorPrimarySection({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: InventoryAgeIndicator
}) {
  const queryClient = useQueryClient()

  return useSingleSectionRecordController<InventoryAgeIndicator, InventoryAgeIndicatorForm>({
    page,
    scope: "inventory-age-indicators",
    id: entry.id,
    initialRecord: entry,
    detailUrl: `/api/inventory-age-indicators/${entry.id}`,
    payloadKey: "inventoryAgeIndicator",
    createLocalValue: toInventoryAgeIndicatorForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateInventoryAgeIndicatorForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }
      const { inventoryAgeIndicator } = await updateInventoryAgeIndicatorRequest(
        record.id,
        localValue,
        record.updatedAt,
      )
      return {
        serverValue: inventoryAgeIndicator,
        noticeMessage: "Age indicator saved",
      }
    },
    deleteRecord: async (record) => {
      await deleteInventoryAgeIndicatorRequest(record.id, record.updatedAt)
      await queryClient.invalidateQueries({ queryKey: INVENTORY_AGE_INDICATORS_LIST_QUERY_KEY })
    },
    deleteErrorMessage: "Failed to delete age indicator",
  })
}
