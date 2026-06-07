"use client"

import { useCallback, useMemo } from "react"
import type { WorkOrderStatusOption } from "@builders/domain"
import { AsyncRichDropdown, type AsyncRichDropdownOption, useAsyncRichDropdownController } from "@/engines/picker"
import {
  WORK_ORDER_STATUS_OPTIONS_QUERY_KEY,
  searchWorkOrderStatusOptionsRequest,
} from "@/modules/work-order-statuses/data/work-order-status-options-request"

export type WorkOrderStatusPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Fires with the resolved option (or null on clear) whenever the
   * selection changes via the dropdown. Lets a host keep a label snapshot
   * in sync with manual picks so the trigger never shows a stale name.
   */
  onOptionSelected?: (option: WorkOrderStatusOption | null) => void
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render
   * the selected status's name even when it isn't in the latest result.
   */
  selectedLabel?: string | null
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loadingMessage?: string
  clearLabel?: string
  disabled?: boolean
  invalid?: boolean
  ariaLabel?: string
  className?: string
  /** Optional initial seed shown before the user types anything. */
  initialOptions?: WorkOrderStatusOption[]
}

function toDropdownOption(option: WorkOrderStatusOption): AsyncRichDropdownOption {
  return { id: option.id, title: option.name }
}

export function WorkOrderStatusPicker({
  value,
  onChange,
  onOptionSelected,
  selectedLabel = null,
  placeholder = "Select a status",
  searchPlaceholder = "Search statuses",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: WorkOrderStatusPickerProps) {
  const controller = useAsyncRichDropdownController<WorkOrderStatusOption>({
    bucketKey: WORK_ORDER_STATUS_OPTIONS_QUERY_KEY,
    searchFn: searchWorkOrderStatusOptionsRequest,
    initialOptions,
  })

  const options = useMemo<AsyncRichDropdownOption[]>(
    () => controller.options.map(toDropdownOption),
    [controller.options],
  )

  const selectedOption = useMemo<AsyncRichDropdownOption | null>(() => {
    if (!value) return null
    if (selectedLabel) return { id: value, title: selectedLabel }
    return null
  }, [selectedLabel, value])

  const handleChange = useCallback(
    (next: string | null) => {
      onChange(next)
      if (!onOptionSelected) return
      const option = next
        ? controller.options.find((candidate) => candidate.id === next) ?? null
        : null
      onOptionSelected(option)
    },
    [onChange, onOptionSelected, controller.options],
  )

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
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      loadingMessage={loadingMessage}
      clearLabel={clearLabel}
      disabled={disabled}
      invalid={invalid}
      ariaLabel={ariaLabel}
      className={className}
    />
  )
}
