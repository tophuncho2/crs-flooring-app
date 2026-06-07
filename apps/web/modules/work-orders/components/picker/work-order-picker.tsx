"use client"

import { useCallback, useMemo } from "react"
import type { WorkOrderOption } from "@builders/domain"
import { AsyncRichDropdown, type AsyncRichDropdownOption, useAsyncRichDropdownController } from "@/engines/picker"
import {
  WORK_ORDER_OPTIONS_SEARCH_QUERY_KEY,
  searchWorkOrderOptionsRequest,
} from "@/modules/work-orders/data/work-order-options-request"

export type WorkOrderPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Optional notification fired alongside `onChange` carrying the full
   * picked option. Lets callers snapshot the picked WO's label so the
   * trigger reflects the new selection on the adjustment relink flow,
   * where `selectedLabel` would otherwise stay pinned to the original.
   */
  onOptionSelected?: (option: WorkOrderOption | null) => void
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

function joinNonEmpty(...parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => !!p && p.trim().length > 0).join(" · ")
}

/**
 * Canonical title for a `WorkOrderOption` — used by the picker's option
 * list, by the picker's selected-option trigger, and by callers that
 * snapshot the picked option's label so the trigger stays in sync after
 * close/reopen (adjustment relink flow).
 */
export function formatWorkOrderOptionTitle(option: WorkOrderOption): string {
  return joinNonEmpty(`#${option.workOrderNumber}`, option.propertyName, option.unitType)
}

function formatWorkOrderOptionSubtitle(option: WorkOrderOption): string {
  return joinNonEmpty(option.unitNumber, option.description)
}

function toDropdownOption(option: WorkOrderOption): AsyncRichDropdownOption {
  const subtitle = formatWorkOrderOptionSubtitle(option)
  return {
    id: option.id,
    title: formatWorkOrderOptionTitle(option),
    ...(subtitle ? { subtitles: [subtitle] } : {}),
  }
}

export function WorkOrderPicker({
  value,
  onChange,
  onOptionSelected,
  warehouseId,
  selectedLabel = null,
  placeholder = "Select work order",
  disabledPlaceholder = "Select warehouse first",
  searchPlaceholder = "Search description or unit type",
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

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchWorkOrderOptionsRequest(search, signal, {
        warehouseId: warehouseId ?? "",
        skip,
      }),
    [warehouseId],
  )

  const controller = useAsyncRichDropdownController<WorkOrderOption>({
    bucketKey,
    pagedSearchFn,
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
    if (selectedLabel) {
      const title = selectedLabel.startsWith("#") ? selectedLabel : `#${selectedLabel}`
      return { id: value, title }
    }
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
      disabled={disabled || warehouseId === null}
      invalid={invalid}
      ariaLabel={ariaLabel}
      className={className}
      hasMore={controller.hasMore}
      isFetchingMore={controller.isFetchingMore}
      onLoadMore={controller.loadMore}
    />
  )
}
