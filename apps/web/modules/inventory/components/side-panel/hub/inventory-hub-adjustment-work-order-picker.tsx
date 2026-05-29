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
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

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
 * Body-takeover picker for the cut-log relink work-order field. Scoped
 * to the parent cut log's warehouse. Commits the full `WorkOrderOption`
 * to the hub controller so the cut-log panel's form + trigger label
 * move in one render.
 */
export function InventoryHubCutLogWorkOrderPicker({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { cutLogPanel, commitWorkOrderPick, closeCutLogPicker } = controller

  const cutLog =
    cutLogPanel.open?.mode === "edit" ? cutLogPanel.open.cutLog : null
  const warehouseId = cutLog?.warehouseId ?? null
  // Scope the picker to work orders that carry the cut log's product, so the
  // matching material item is always resolvable on select (and auto-linked).
  const productId = cutLog?.productId ?? null

  const bucketKey = useMemo(
    () =>
      [...WORK_ORDER_OPTIONS_SEARCH_QUERY_KEY, warehouseId ?? null, productId ?? null] as const,
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
      commitWorkOrderPick(raw)
    },
    [commitWorkOrderPick],
  )

  const handleClear = useCallback(() => {
    commitWorkOrderPick(null)
  }, [commitWorkOrderPick])

  const selectedId = cutLogPanel.form.workOrderId
  const selectedLabel = cutLogPanel.local.pickedWorkOrderLabel ||
    (cutLog?.workOrderNumber ? `#${cutLog.workOrderNumber}` : null)

  return (
    <HubSidePanelPicker
      controller={dropdown}
      toOption={toOption}
      selectedId={selectedId}
      selectedLabel={selectedLabel}
      onSelect={handleSelect}
      onClear={handleClear}
      onCancel={closeCutLogPicker}
      searchPlaceholder="Search description or unit type"
      emptyMessage="No matches"
      loadingMessage="Searching…"
      clearLabel="Clear selection"
    />
  )
}
