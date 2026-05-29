"use client"

import { useCallback, useMemo } from "react"
import type { WorkOrderOption } from "@builders/domain"
import { HubSidePanelPicker, type HubSidePanelPickerOption } from "@/components/hub-side-panel"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  WORK_ORDER_OPTIONS_SEARCH_QUERY_KEY,
  searchWorkOrderOptionsRequest,
} from "@/modules/work-orders/data/work-order-options-request"
import { formatWorkOrderOptionTitle } from "@/modules/work-orders/components/picker/work-order-picker"
import type { AdjustmentEditPanelController } from "@/modules/adjustments/controllers/adjustment-side-panel"

function joinNonEmpty(...parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => !!p && p.trim().length > 0).join(" · ")
}

function toPickerOption(option: WorkOrderOption): HubSidePanelPickerOption {
  const subtitle = joinNonEmpty(option.unitNumber, option.description)
  return {
    id: option.id,
    title: formatWorkOrderOptionTitle(option),
    subtitle: subtitle.length > 0 ? subtitle : null,
  }
}

/**
 * Body-takeover work-order picker for the adjustment relink field. Scoped to
 * the form's warehouse + the fixed product (the options API requires a
 * warehouse, so the picker is gated until one is chosen). Selecting a WO
 * deterministically auto-links its matching material item via
 * `selectWorkOrderOption`. Used by both surfaces (WO record view + inventory
 * hub) through the shared adjustment controller.
 */
export function AdjustmentWorkOrderPickerTakeover({
  controller,
}: {
  controller: AdjustmentEditPanelController
}) {
  const { warehouseId, productId, form, local, closePicker, selectWorkOrderOption } =
    controller

  const bucketKey = useMemo(
    () => [...WORK_ORDER_OPTIONS_SEARCH_QUERY_KEY, warehouseId ?? null, productId ?? null] as const,
    [warehouseId, productId],
  )

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchWorkOrderOptionsRequest(search, signal, {
        warehouseId: warehouseId ?? "",
        ...(productId ? { productId } : {}),
        skip,
      }),
    [warehouseId, productId],
  )

  const dropdown = useAsyncRichDropdownController<WorkOrderOption>({
    bucketKey,
    pagedSearchFn,
    enabled: warehouseId !== null,
  })

  const toOption = useMemo(() => toPickerOption, [])

  const handleSelect = useCallback(
    (_option: HubSidePanelPickerOption, raw: WorkOrderOption) => {
      void selectWorkOrderOption(raw)
    },
    [selectWorkOrderOption],
  )

  const handleClear = useCallback(() => {
    void selectWorkOrderOption(null)
  }, [selectWorkOrderOption])

  return (
    <HubSidePanelPicker
      controller={dropdown}
      toOption={toOption}
      selectedId={form.workOrderId}
      selectedLabel={local.pickedWorkOrderLabel || null}
      onSelect={handleSelect}
      onClear={handleClear}
      onCancel={closePicker}
      searchPlaceholder="Search description or unit type"
      emptyMessage={warehouseId ? "No matches" : "Select warehouse first"}
      loadingMessage="Searching…"
      clearLabel="Clear selection"
    />
  )
}
