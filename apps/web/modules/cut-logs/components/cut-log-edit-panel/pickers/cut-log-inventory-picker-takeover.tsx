"use client"

import { useCallback, useMemo } from "react"
import {
  formatInventoryQuantity,
  type InventoryOption,
} from "@builders/domain"
import { HubSidePanelPicker, type HubSidePanelPickerOption } from "@/components/hub-side-panel"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  INVENTORY_OPTIONS_SEARCH_QUERY_KEY,
  searchInventoryOptionsRequest,
} from "@/modules/inventory/data/inventory-options-request"
import type { CutLogEditPanelController } from "@/modules/cut-logs/controllers/cut-log-side-panel"

function toPickerOption(option: InventoryOption): HubSidePanelPickerOption {
  // Subtitles disambiguate same-product rows on one warehouse: location
  // first (so operators can scan "is this one where I think it is"),
  // then stock balance and (when applicable) coverage balance.
  const subtitles: string[] = []
  if (option.location && option.location.length > 0) subtitles.push(option.location)
  subtitles.push(formatInventoryQuantity(option.stockBalance, option.stockUnitAbbrev))
  if (option.coverageBalance !== null) {
    subtitles.push(formatInventoryQuantity(option.coverageBalance, option.itemCoverageUnitAbbrev))
  }
  return {
    id: option.id,
    title: option.inventoryItem,
    subtitle: subtitles.join(" · "),
  }
}

/**
 * Body-takeover inventory picker for the cut-log create form. Scoped to
 * the parent WO's warehouse + the parent WOMI's product, narrowed
 * further by the panel's free-text location filter. Commit hands the
 * full option to the controller so form id + trigger label move in one
 * render — same atomic write the popover picker fix introduced.
 */
export function CutLogInventoryPickerTakeover({
  controller,
}: {
  controller: CutLogEditPanelController
}) {
  const { warehouseId, form, local, open, closePicker, selectInventoryOption } =
    controller

  const productId = open?.mode === "create" ? open.productId || null : null
  const location = local.locationFilter || null

  const bucketKey = useMemo(
    () =>
      [
        ...INVENTORY_OPTIONS_SEARCH_QUERY_KEY,
        warehouseId,
        productId,
        location,
      ] as const,
    [warehouseId, productId, location],
  )

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchInventoryOptionsRequest(search, signal, {
        warehouseId: warehouseId ?? "",
        ...(productId ? { productId } : {}),
        ...(location ? { location } : {}),
      }),
    [warehouseId, productId, location],
  )

  const dropdown = useAsyncRichDropdownController<InventoryOption>({
    bucketKey,
    searchFn,
    enabled: warehouseId !== null,
  })

  const toOption = useMemo(() => toPickerOption, [])

  const handleSelect = useCallback(
    (_option: HubSidePanelPickerOption, raw: InventoryOption) => {
      selectInventoryOption(raw)
    },
    [selectInventoryOption],
  )

  const handleClear = useCallback(() => {
    selectInventoryOption(null)
  }, [selectInventoryOption])

  return (
    <HubSidePanelPicker
      controller={dropdown}
      toOption={toOption}
      selectedId={form.inventoryId || null}
      selectedLabel={local.pickedInventoryLabel || null}
      onSelect={handleSelect}
      onClear={handleClear}
      onCancel={closePicker}
      searchPlaceholder="Search inventory item"
      emptyMessage={warehouseId ? "No matches" : "Select warehouse first"}
      loadingMessage="Searching…"
      clearLabel="Clear selection"
    />
  )
}
