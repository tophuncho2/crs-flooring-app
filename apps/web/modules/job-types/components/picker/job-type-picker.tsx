"use client"

import { useMemo } from "react"
import type { JobTypeOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  JOB_TYPE_OPTIONS_QUERY_KEY,
  searchJobTypeOptionsRequest,
} from "@/modules/job-types/data/job-type-options-request"

export type JobTypePickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected job type's name even when it isn't in the latest server result.
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
  initialOptions?: JobTypeOption[]
}

function toDropdownOption(option: JobTypeOption): AsyncRichDropdownOption {
  return { id: option.id, title: option.name }
}

export function JobTypePicker({
  value,
  onChange,
  selectedLabel = null,
  placeholder = "Select a job type",
  searchPlaceholder = "Search job types",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: JobTypePickerProps) {
  const controller = useAsyncRichDropdownController<JobTypeOption>({
    bucketKey: JOB_TYPE_OPTIONS_QUERY_KEY,
    searchFn: searchJobTypeOptionsRequest,
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
