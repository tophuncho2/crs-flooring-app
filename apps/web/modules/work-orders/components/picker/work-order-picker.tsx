"use client"

import { useCallback, useMemo } from "react"
import type { WorkOrderOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  WORK_ORDER_OPTIONS_SEARCH_QUERY_KEY,
  searchWorkOrderOptionsRequest,
} from "@/modules/work-orders/data/work-order-options-request"

export type WorkOrderPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Required scope — every work order belongs to a warehouse. Picker
   * renders disabled when null.
   */
  warehouseId: string | null
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render
   * the selected WO's number even before any search runs.
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
  initialOptions?: WorkOrderOption[]
}

function toDropdownOption(option: WorkOrderOption): AsyncRichDropdownOption {
  return { id: option.id, title: `#${option.workOrderNumber}` }
}

export function WorkOrderPicker({
  value,
  onChange,
  warehouseId,
  selectedLabel = null,
  placeholder = "Select work order",
  disabledPlaceholder = "Select warehouse first",
  searchPlaceholder = "Search work-order number",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: WorkOrderPickerProps) {
  const enabled = warehouseId !== null && !disabled

  const bucketKey = useMemo(
    () => [...WORK_ORDER_OPTIONS_SEARCH_QUERY_KEY, warehouseId ?? null] as const,
    [warehouseId],
  )

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchWorkOrderOptionsRequest(search, signal, {
        warehouseId: warehouseId ?? "",
      }),
    [warehouseId],
  )

  const controller = useAsyncRichDropdownController<WorkOrderOption>({
    bucketKey,
    searchFn,
    initialOptions,
    enabled,
  })

  const options = useMemo<AsyncRichDropdownOption[]>(
    () => controller.options.map(toDropdownOption),
    [controller.options],
  )

  const selectedOption = useMemo<AsyncRichDropdownOption | null>(() => {
    if (!value) return null
    if (selectedLabel) {
      const title = selectedLabel.startsWith("#") ? selectedLabel : `#${selectedLabel}`
      return { id: value, title }
    }
    return null
  }, [selectedLabel, value])

  return (
    <AsyncRichDropdown
      value={value}
      onChange={onChange}
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
      disabled={disabled || warehouseId === null}
      invalid={invalid}
      ariaLabel={ariaLabel}
      className={className}
    />
  )
}
