"use client"

import { useCallback, useMemo } from "react"
import type { WarehouseOption } from "@builders/domain"
import { HubSidePanelPicker, type HubSidePanelPickerOption } from "@/components/hub-side-panel"
import { useAsyncRichDropdownController } from "@/engines/dropdowns"
import {
  WAREHOUSE_OPTIONS_QUERY_KEY,
  searchWarehouseOptionsRequest,
} from "@/modules/warehouse/data/warehouse-options-request"
import type { AdjustmentEditPanelController } from "@/modules/adjustments/controllers/adjustment-side-panel"

function toPickerOption(option: WarehouseOption): HubSidePanelPickerOption {
  return { id: option.id, title: option.name }
}

/**
 * Body-takeover warehouse picker for the adjustment create form. The warehouse
 * is only an inventory filter — selecting one clears the chosen inventory +
 * location below it (see `selectWarehouseOption`). The options request's
 * signature is `(query, signal, skip)`, so it's wired directly.
 */
export function AdjustmentWarehousePickerTakeover({
  controller,
}: {
  controller: AdjustmentEditPanelController
}) {
  const { form, local, closePicker, selectWarehouseOption } = controller

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchWarehouseOptionsRequest(search, signal, skip),
    [],
  )

  const dropdown = useAsyncRichDropdownController<WarehouseOption>({
    bucketKey: WAREHOUSE_OPTIONS_QUERY_KEY,
    pagedSearchFn,
  })

  const toOption = useMemo(() => toPickerOption, [])

  const handleSelect = useCallback(
    (_option: HubSidePanelPickerOption, raw: WarehouseOption) => {
      selectWarehouseOption(raw)
    },
    [selectWarehouseOption],
  )

  const handleClear = useCallback(() => {
    selectWarehouseOption(null)
  }, [selectWarehouseOption])

  return (
    <HubSidePanelPicker
      controller={dropdown}
      toOption={toOption}
      selectedId={form.warehouseId}
      selectedLabel={local.pickedWarehouseLabel || null}
      onSelect={handleSelect}
      onClear={handleClear}
      onCancel={closePicker}
      searchPlaceholder="Search warehouses"
      emptyMessage="No matches"
      loadingMessage="Searching…"
      clearLabel="Clear selection"
    />
  )
}
