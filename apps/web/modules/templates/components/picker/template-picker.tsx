"use client"

import { useCallback, useMemo } from "react"
import { formatTemplatePlannedProductsCount, type TemplateOption } from "@builders/domain"
import { AsyncRichDropdown, type AsyncRichDropdownOption, useAsyncRichDropdownController } from "@/engines/picker"
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
   * Optional property scope. When set, narrows the template search to that
   * property; null just means "no property scope". The picker is always
   * selectable regardless.
   */
  propertyId: string | null
  /**
   * entity scope, consulted only when no `propertyId` is set (a property already
   * implies its entity). Lets the list filter narrow templates to an entity's
   * properties before any specific property is chosen.
   */
  entityId?: string | null
  /**
   * Pre-resolved label for the current `value`. Lets the trigger render the
   * selected template's label even when it isn't in the latest server result.
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
  initialOptions?: TemplateOption[]
}

function toDropdownOption(option: TemplateOption): AsyncRichDropdownOption {
  const subtitles = [option.jobTypeName, option.description].filter(
    (value): value is string => Boolean(value && value.trim().length > 0),
  )
  return {
    id: option.id,
    // Blank unit type falls through to the engine's "No visible details" fallback.
    title: option.unitType,
    subtitles,
    meta: formatTemplatePlannedProductsCount(option.plannedProductsCount),
  }
}

export function TemplatePicker({
  value,
  onChange,
  onOptionSelected,
  propertyId,
  entityId = null,
  selectedLabel = null,
  placeholder = "Select a template",
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
  const entityKey = entityId ?? null
  // Always selectable; fetches with whatever property/entity scope it has.
  const enabled = !disabled

  const bucketKey = useMemo(
    () => [...TEMPLATE_OPTIONS_QUERY_KEY, propertyKey, entityKey] as const,
    [propertyKey, entityKey],
  )

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchTemplateOptionsRequest(search, signal, {
        propertyId: propertyId ?? undefined,
        entityId: entityId ?? undefined,
        skip,
      }),
    [propertyId, entityId],
  )

  const controller = useAsyncRichDropdownController<TemplateOption>({
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
      stackSubtitles
    />
  )
}
