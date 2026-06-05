"use client"

import { useCallback, useMemo } from "react"
import type { WorkOrderMaterialItemOption } from "@builders/domain"
import { AsyncRichDropdown, type AsyncRichDropdownOption, useAsyncRichDropdownController } from "@/engines/dropdowns"
import {
  WORK_ORDER_MATERIAL_ITEM_OPTIONS_QUERY_KEY,
  searchWorkOrderMaterialItemOptionsRequest,
} from "@/modules/work-orders/data/work-order-material-item-options-request"

export type WorkOrderMaterialItemPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Optional notification fired alongside `onChange` carrying the full
   * picked option. Lets callers snapshot the picked WOMI's label so the
   * trigger reflects the new selection on the adjustment relink flow.
   */
  onOptionSelected?: (option: WorkOrderMaterialItemOption | null) => void
  /**
   * Required scope — WOMIs are picked under a specific work order. Picker
   * renders disabled when null.
   */
  workOrderId: string | null
  /**
   * Required filter — adjustments are product-locked, so the picker only ever
   * surfaces WOMIs whose product matches the adjustment's snapshot. Disabled
   * when null.
   */
  productId: string | null
  /**
   * Pre-resolved label for the current `value`. Used to keep the trigger
   * label populated before the first fetch returns.
   */
  selectedLabel?: string | null
  placeholder?: string
  disabledPlaceholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
  initialOptions?: WorkOrderMaterialItemOption[]
}

function toDropdownOption(option: WorkOrderMaterialItemOption): AsyncRichDropdownOption {
  // Subtitle disambiguates same-product WOMIs on one WO by surfacing the
  // quantity + send-unit. Two "Pad 8lb" rows then read as e.g. "100 sf" vs.
  // "20 sf" instead of two identical lines.
  const qty = option.quantity?.trim() ?? ""
  const unit = option.sendUnitAbbrev?.trim() ?? ""
  const subtitle = [qty, unit].filter((s) => s.length > 0).join(" ")
  return {
    id: option.id,
    title: option.productName,
    subtitles: subtitle.length > 0 ? [subtitle] : [],
  }
}

export function WorkOrderMaterialItemPicker({
  value,
  onChange,
  onOptionSelected,
  workOrderId,
  productId,
  selectedLabel = null,
  placeholder = "Select material item",
  disabledPlaceholder = "Select work order first",
  searchPlaceholder = "Search material items",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: WorkOrderMaterialItemPickerProps) {
  const enabled = workOrderId !== null && productId !== null && !disabled

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

  const controller = useAsyncRichDropdownController<WorkOrderMaterialItemOption>({
    bucketKey,
    searchFn,
    initialOptions,
    enabled,
  })

  const handleChange = useCallback(
    (id: string | null) => {
      onChange(id)
      if (onOptionSelected) {
        const option = id ? controller.options.find((o) => o.id === id) ?? null : null
        onOptionSelected(option)
      }
    },
    [onChange, onOptionSelected, controller.options],
  )

  const options = useMemo<AsyncRichDropdownOption[]>(
    () => controller.options.map(toDropdownOption),
    [controller.options],
  )

  const selectedOption = useMemo<AsyncRichDropdownOption | null>(() => {
    if (!value) return null
    if (selectedLabel) return { id: value, title: selectedLabel }
    return null
  }, [selectedLabel, value])

  return (
    <AsyncRichDropdown
      value={value}
      onChange={handleChange}
      options={options}
      selectedOption={selectedOption}
      query={controller.query}
      onQueryChange={controller.onQueryChange}
      isLoading={controller.isLoading || controller.isFetching}
      errorMessage={controller.errorMessage}
      placeholder={enabled ? placeholder : disabledPlaceholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      loadingMessage={loadingMessage}
      clearLabel={clearLabel}
      disabled={disabled || workOrderId === null || productId === null}
      invalid={invalid}
      ariaLabel={ariaLabel}
      className={className}
    />
  )
}
