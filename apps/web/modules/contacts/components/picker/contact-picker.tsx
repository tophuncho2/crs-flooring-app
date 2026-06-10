"use client"

import { useCallback, useMemo } from "react"
import type { ContactOption } from "@builders/domain"
import { AsyncRichDropdown, type AsyncRichDropdownOption, useAsyncRichDropdownController } from "@/engines/picker"
import {
  CONTACT_OPTIONS_QUERY_KEY,
  searchContactOptionsRequest,
} from "@/modules/contacts/data/contact-options-request"

export type ContactPickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  onOptionSelected?: (option: ContactOption | null) => void
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
  initialOptions?: ContactOption[]
}

function toDropdownOption(option: ContactOption): AsyncRichDropdownOption {
  return { id: option.id, title: option.name }
}

export function ContactPicker({
  value,
  onChange,
  onOptionSelected,
  selectedLabel = null,
  placeholder = "Select a contact",
  searchPlaceholder = "Search contacts",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: ContactPickerProps) {
  const controller = useAsyncRichDropdownController<ContactOption>({
    bucketKey: CONTACT_OPTIONS_QUERY_KEY,
    searchFn: searchContactOptionsRequest,
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
