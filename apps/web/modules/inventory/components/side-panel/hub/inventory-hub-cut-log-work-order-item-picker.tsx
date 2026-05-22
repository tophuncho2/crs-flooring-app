"use client"

import { useCallback, useMemo } from "react"
import type { WorkOrderMaterialItemOption } from "@builders/domain"
import { HubSidePanelPicker, type HubSidePanelPickerOption } from "@/components/hub-side-panel"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  WORK_ORDER_MATERIAL_ITEM_OPTIONS_QUERY_KEY,
  searchWorkOrderMaterialItemOptionsRequest,
} from "@/modules/work-orders/data/work-order-material-item-options-request"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

function toPickerOption(option: WorkOrderMaterialItemOption): HubSidePanelPickerOption {
  // Disambiguate same-product WOMIs on one WO via quantity + send-unit
  // — matches the popover picker's subtitle convention.
  const qty = option.quantity?.trim() ?? ""
  const unit = option.sendUnitAbbrev?.trim() ?? ""
  const subtitle = [qty, unit].filter((s) => s.length > 0).join(" ")
  return {
    id: option.id,
    title: option.productName,
    subtitle: subtitle.length > 0 ? subtitle : null,
  }
}

/**
 * Body-takeover picker for the cut-log relink material-item field.
 * Scoped to the cut-log's currently-selected work order + the cut-log's
 * product (cut logs are product-locked — the server enforces it via the
 * cut-log update use case).
 */
export function InventoryHubCutLogWorkOrderItemPicker({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { cutLogPanel, commitWorkOrderItemPick, closeCutLogPicker } = controller

  const cutLog =
    cutLogPanel.open?.mode === "edit" ? cutLogPanel.open.cutLog : null
  const workOrderId = cutLogPanel.form.workOrderId
  const productId = cutLog?.productId ?? null

  const bucketKey = useMemo(
    () =>
      [
        ...WORK_ORDER_MATERIAL_ITEM_OPTIONS_QUERY_KEY,
        workOrderId ?? null,
        productId ?? null,
      ] as const,
    [workOrderId, productId],
  )

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchWorkOrderMaterialItemOptionsRequest(search, signal, {
        workOrderId: workOrderId ?? "",
        productId: productId ?? "",
      }),
    [workOrderId, productId],
  )

  const dropdown = useAsyncRichDropdownController<WorkOrderMaterialItemOption>({
    bucketKey,
    searchFn,
    enabled: workOrderId !== null && productId !== null,
  })

  const toOption = useMemo(() => toPickerOption, [])

  const handleSelect = useCallback(
    (_option: HubSidePanelPickerOption, raw: WorkOrderMaterialItemOption) => {
      commitWorkOrderItemPick(raw)
    },
    [commitWorkOrderItemPick],
  )

  const handleClear = useCallback(() => {
    commitWorkOrderItemPick(null)
  }, [commitWorkOrderItemPick])

  const selectedId = cutLogPanel.form.workOrderItemId
  const selectedLabel =
    cutLogPanel.local.pickedWorkOrderItemLabel ||
    cutLog?.workOrderItemProductLabel ||
    cutLog?.productName ||
    null

  return (
    <HubSidePanelPicker
      controller={dropdown}
      toOption={toOption}
      selectedId={selectedId}
      selectedLabel={selectedLabel}
      onSelect={handleSelect}
      onClear={handleClear}
      onCancel={closeCutLogPicker}
      searchPlaceholder="Search material items"
      emptyMessage="No matches"
      loadingMessage="Searching…"
      clearLabel="Clear selection"
    />
  )
}
