"use client"

import { useMemo } from "react"
import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  describeInventoryValidationIssues,
  toInventoryForm,
  validateInventoryInput,
  type InventoryDetail,
  type InventoryForm,
  type InventoryLocationOption,
} from "@builders/domain"

export function useInventoryPrimarySection({
  page,
  inventory,
  locationOptions,
}: {
  page: RecordDetailClientScaffoldContext
  inventory: InventoryDetail
  locationOptions: InventoryLocationOption[]
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
      const issues = validateInventoryInput(
        {
          productId: localValue.productId,
          itemNumber: localValue.itemNumber,
          warehouseId: localValue.warehouseId || null,
          locationId: localValue.locationId || null,
          stockCount: localValue.stockCount,
        },
        null,
      )
      if (issues.length > 0) {
        throw createRecordSectionError({
          kind: "validation",
          message: describeInventoryValidationIssues(issues),
          retryable: true,
        })
      }

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

  const selectedLocation = useMemo(
    () =>
      locationOptions.find(
        (location) => location.id === controller.primarySection.localValue.locationId,
      ) ?? null,
    [controller.primarySection.localValue.locationId, locationOptions],
  )

  const locationScopeId =
    controller.record.importWarehouseId || controller.record.warehouseId || ""
  const availableLocationOptions = useMemo(() => {
    if (!locationScopeId) {
      return locationOptions
    }
    return locationOptions.filter((location) => location.warehouseId === locationScopeId)
  }, [locationOptions, locationScopeId])

  const activeWarehouseName =
    selectedLocation?.warehouseName ||
    controller.record.importWarehouseName ||
    controller.record.warehouseName ||
    ""
  const activeSectionName =
    selectedLocation?.sectionNumber !== null && selectedLocation?.sectionNumber !== undefined
      ? String(selectedLocation.sectionNumber)
      : controller.record.sectionNumber || ""

  return {
    ...controller,
    availableLocationOptions,
    activeWarehouseName,
    activeSectionName,
  }
}
