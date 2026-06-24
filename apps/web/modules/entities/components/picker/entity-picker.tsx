"use client"

import { useCallback, useMemo } from "react"
import type { EntityOption } from "@builders/domain"
import { AsyncRichDropdown, type AsyncRichDropdownOption, useAsyncRichDropdownController } from "@/engines/picker"
import {
  ENTITY_OPTIONS_QUERY_KEY,
  searchEntityOptionsRequest,
} from "@/modules/entities/data/entity-options-request"

export type EntityPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Optional notification fired alongside `onChange` carrying the full
   * picked option (or null on clear). Lets callers refresh the trigger's
   * label snapshot for the new value without waiting for a server refetch.
   *
   * Only fires when the option is present in the picker's current
   * search results; the picker does not refetch by id.
   */
  onOptionSelected?: (option: EntityOption | null) => void
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected entity's name even when it isn't in the latest server result.
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
  /** Optional initial seed shown before the user types anything (e.g. SSR-loaded top 20). */
  initialOptions?: EntityOption[]
}

function toDropdownOption(option: EntityOption): AsyncRichDropdownOption {
  return { id: option.id, title: option.entity }
}

export function EntityPicker({
  value,
  onChange,
  onOptionSelected,
  selectedLabel = null,
  placeholder = "Filter by entity",
  searchPlaceholder = "Search entities",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: EntityPickerProps) {
  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchEntityOptionsRequest(search, signal, { skip }),
    [],
  )

  const controller = useAsyncRichDropdownController<EntityOption>({
    bucketKey: ENTITY_OPTIONS_QUERY_KEY,
    pagedSearchFn,
    initialOptions,
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
      isLoading={controller.isLoading}
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
      hasMore={controller.hasMore}
      isFetchingMore={controller.isFetchingMore}
      onLoadMore={controller.loadMore}
    />
  )
}
