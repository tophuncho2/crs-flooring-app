"use client"

import { useCallback, useMemo } from "react"
import type { PropertyOption } from "@builders/domain"
import { AsyncOptionPicker, type AsyncRichDropdownOption } from "@/engines/picker"
import {
  PROPERTY_OPTIONS_QUERY_KEY,
  searchPropertyOptionsRequest,
} from "@/modules/properties/data/property-options-request"

export type PropertyPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Optional notification fired alongside `onChange` carrying the full
   * picked option (or null on clear). Lets callers reflect the picked
   * property's joined fields in adjacent UI before save — e.g. the WO
   * record's address preview cells.
   *
   * Only fires when the option is present in the picker's current
   * search results; the picker does not refetch by id.
   */
  onOptionSelected?: (option: PropertyOption | null) => void
  /**
   * Optional entity filter. When set, only properties belonging
   * to that company are returned. Also folded into the controller's bucket
   * key so React Query buckets results per filter.
   */
  entityId?: string | null
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected property's name even when it isn't in the latest server result.
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
  initialOptions?: PropertyOption[]
}

function toDropdownOption(option: PropertyOption): AsyncRichDropdownOption {
  const subtitles = option.address ? [option.address] : []
  return { id: option.id, title: option.name, subtitles }
}

export function PropertyPicker({
  value,
  onChange,
  onOptionSelected,
  entityId = null,
  selectedLabel = null,
  placeholder = "Select a property",
  searchPlaceholder = "Search properties",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: PropertyPickerProps) {
  const bucketKey = useMemo(
    () => [...PROPERTY_OPTIONS_QUERY_KEY, entityId ?? null] as const,
    [entityId],
  )

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchPropertyOptionsRequest(search, signal, {
        entityId: entityId ?? undefined,
        skip,
      }),
    [entityId],
  )

  return (
    <AsyncOptionPicker<PropertyOption>
      value={value}
      onChange={onChange}
      onOptionSelected={onOptionSelected}
      selectedLabel={selectedLabel}
      bucketKey={bucketKey}
      pagedSearchFn={pagedSearchFn}
      toOption={toDropdownOption}
      initialOptions={initialOptions}
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
