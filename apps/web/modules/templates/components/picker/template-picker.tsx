"use client"

import { useCallback, useMemo } from "react"
import type { TemplateOption } from "@builders/domain"
import { AsyncRichDropdown } from "@/components/dropdowns/async-rich-dropdown"
import type { AsyncRichDropdownOption } from "@/components/dropdowns/async-rich-dropdown"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  TEMPLATE_OPTIONS_QUERY_KEY,
  searchTemplateOptionsRequest,
} from "@/modules/templates/data/template-options-request"

export type TemplatePickerProps = {
  value: string | null
  onChange: (id: string | null) => void
  /**
   * Fires alongside `onChange` with the full picked option (or null on clear).
   * Used by forms that need to cascade other fields from the template — e.g.
   * the WO form pastes `option.unitType` into the editable `unitType` field.
   */
  onOptionSelected?: (option: TemplateOption | null) => void
  /**
   * Required filter — templates dropdown is property-scoped. When null the
   * picker is rendered disabled with a "Select a property first" placeholder.
   */
  propertyId: string | null
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected template's label even when it isn't in the latest server result.
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
  initialOptions?: TemplateOption[]
}

function toDropdownOption(option: TemplateOption): AsyncRichDropdownOption {
  const subtitles = option.description ? [option.description] : []
  return { id: option.id, title: option.unitType || "—", subtitles }
}

export function TemplatePicker({
  value,
  onChange,
  onOptionSelected,
  propertyId,
  selectedLabel = null,
  placeholder = "Select a template",
  disabledPlaceholder = "Select a property first",
  searchPlaceholder = "Search templates",
  emptyMessage = "No matches",
  loadingMessage = "Searching…",
  clearLabel = "Clear selection",
  disabled,
  invalid,
  ariaLabel,
  className,
  initialOptions,
}: TemplatePickerProps) {
  const propertyKey = propertyId ?? null
  const enabled = propertyId !== null && !disabled

  const bucketKey = useMemo(
    () => [...TEMPLATE_OPTIONS_QUERY_KEY, propertyKey] as const,
    [propertyKey],
  )

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchTemplateOptionsRequest(search, signal, {
        propertyId: propertyId ?? "",
      }),
    [propertyId],
  )

  const controller = useAsyncRichDropdownController<TemplateOption>({
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
      disabled={disabled || !propertyId}
      invalid={invalid}
      ariaLabel={ariaLabel}
      className={className}
    />
  )
}
