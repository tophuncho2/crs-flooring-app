"use client"

import { useCallback, useMemo } from "react"
import type { ManagementCompanyOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY,
  searchManagementCompanyOptionsRequest,
} from "@/modules/management-companies/data/management-company-options-request"

export type ManagementCompanyPickerProps = {
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
  onOptionSelected?: (option: ManagementCompanyOption | null) => void
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected company's name even when it isn't in the latest server result.
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
  initialOptions?: ManagementCompanyOption[]
}

function toDropdownOption(option: ManagementCompanyOption): AsyncRichDropdownOption {
  return { id: option.id, title: option.name }
}

export function ManagementCompanyPicker({
  value,
  onChange,
  onOptionSelected,
  selectedLabel = null,
  placeholder = "Filter by company",
  searchPlaceholder = "Search companies",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: ManagementCompanyPickerProps) {
  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchManagementCompanyOptionsRequest(search, signal, { skip }),
    [],
  )

  const controller = useAsyncRichDropdownController<ManagementCompanyOption>({
    bucketKey: MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY,
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
