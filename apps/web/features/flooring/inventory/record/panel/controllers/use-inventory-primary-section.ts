"use client"

import { useMemo } from "react"
import { requestJson } from "@/features/flooring/shared/transport/http"
import {
  createRecordSectionError,
  useSingleSectionRecordController,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import {
  toInventoryPrimaryForm,
  validateInventoryPrimaryForm,
  type InventoryPrimaryForm,
  type InventoryRow,
  type LocationOption,
} from "../../../domain/types"

export function useInventoryPrimarySection({
  page,
  inventory,
  locationOptions,
}: {
  page: RecordDetailClientScaffoldContext
  inventory: InventoryRow
  locationOptions: LocationOption[]
}) {
  const controller = useSingleSectionRecordController<InventoryRow, InventoryPrimaryForm>({
    page,
    scope: "inventory",
    id: inventory.id,
    initialRecord: inventory,
    detailUrl: `/api/flooring/inventory/${inventory.id}`,
    payloadKey: "inventory",
    createLocalValue: toInventoryPrimaryForm,
    manageDirtySections: false,
    saveSection: async ({ localValue, record }) => {
      const validationError = validateInventoryPrimaryForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }

      const payload = await requestJson<{ inventory: InventoryRow }>(`/api/flooring/inventory/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localValue),
      })

      return {
        serverValue: payload.inventory,
        noticeMessage: "Inventory saved",
      }
    },
    deleteRecord: async (record) => {
      await requestJson<{ ok: true }>(`/api/flooring/inventory/${record.id}`, {
        method: "DELETE",
      })
    },
    deleteErrorMessage: "Failed to delete inventory",
  })

  const selectedLocation = useMemo(
    () => locationOptions.find((location) => location.id === controller.primarySection.localValue.locationId) ?? null,
    [controller.primarySection.localValue.locationId, locationOptions],
  )

  const locationScopeId = controller.record.importWarehouseId || controller.record.warehouseId || ""
  const availableLocationOptions = useMemo(() => {
    if (!locationScopeId) {
      return locationOptions
    }

    return locationOptions.filter((location) => location.warehouseId === locationScopeId)
  }, [locationOptions, locationScopeId])

  const activeWarehouseName =
    selectedLocation?.warehouseName || controller.record.importWarehouseName || controller.record.warehouseName || ""
  const activeSectionName = selectedLocation?.sectionName || controller.record.sectionName || ""

  return {
    ...controller,
    availableLocationOptions,
    activeWarehouseName,
    activeSectionName,
  }
}
