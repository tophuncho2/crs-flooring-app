"use client"

import { useCallback, useMemo } from "react"
import type { InventoryLocationOption } from "@builders/domain"
import { HubSidePanelPicker, type HubSidePanelPickerOption } from "@/components/hub-side-panel"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  INVENTORY_LOCATIONS_SEARCH_QUERY_KEY,
  searchInventoryLocationsRequest,
} from "@/modules/inventory/data/inventory-location-options-request"
import type { CutLogEditPanelController } from "@/modules/cut-logs/controllers/cut-log-side-panel"

function toPickerOption(option: InventoryLocationOption): HubSidePanelPickerOption {
  return { id: option.value, title: option.value }
}

/**
 * Body-takeover location-filter picker for the cut-log create form.
 * Warehouse-scoped (locations are derived via SELECT DISTINCT on
 * inventory). Commit writes the raw string into the form's
 * `locationFilter` and closes the takeover; the downstream inventory
 * picker re-fetches under the new filter on next open.
 */
export function CutLogLocationPickerTakeover({
  controller,
}: {
  controller: CutLogEditPanelController
}) {
  const { warehouseId, local, closePicker, selectLocationFilter } = controller

  const bucketKey = useMemo(
    () => [...INVENTORY_LOCATIONS_SEARCH_QUERY_KEY, warehouseId] as const,
    [warehouseId],
  )

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchInventoryLocationsRequest(search, signal, {
        warehouseId: warehouseId ?? "",
        skip,
      }),
    [warehouseId],
  )

  const dropdown = useAsyncRichDropdownController<InventoryLocationOption>({
    bucketKey,
    pagedSearchFn,
    enabled: warehouseId !== null,
  })

  const toOption = useMemo(() => toPickerOption, [])

  const handleSelect = useCallback(
    (_option: HubSidePanelPickerOption, raw: InventoryLocationOption) => {
      selectLocationFilter(raw.value)
    },
    [selectLocationFilter],
  )

  const handleClear = useCallback(() => {
    selectLocationFilter(null)
  }, [selectLocationFilter])

  return (
    <HubSidePanelPicker
      controller={dropdown}
      toOption={toOption}
      selectedId={local.locationFilter || null}
      selectedLabel={local.locationFilter || null}
      onSelect={handleSelect}
      onClear={handleClear}
      onCancel={closePicker}
      searchPlaceholder="Search location"
      emptyMessage={warehouseId ? "No matches" : "Select warehouse first"}
      loadingMessage="Searching…"
      clearLabel="Clear selection"
    />
  )
}
