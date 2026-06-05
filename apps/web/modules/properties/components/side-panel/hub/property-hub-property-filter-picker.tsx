"use client"

import { useCallback, useMemo } from "react"
import type { PropertyOption } from "@builders/domain"
import { HubSidePanelPicker, type HubSidePanelPickerOption } from "@/components/hub-side-panel"
import { useAsyncRichDropdownController } from "@/engines/dropdowns"
import {
  PROPERTY_OPTIONS_QUERY_KEY,
  searchPropertyOptionsRequest,
} from "@/modules/properties/data/property-options-request"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

function toPickerOption(option: PropertyOption): HubSidePanelPickerOption {
  const subtitle = option.address.trim().length > 0 ? option.address : null
  return { id: option.id, title: option.name, subtitle }
}

/**
 * Inline-in-body property picker for the hub's templates view — filters the
 * templates list to a single property. Mirrors the legacy hub-view filter
 * panel; selection or clear pops the picker takeover and returns to the
 * templates view.
 */
export function PropertyHubPropertyFilterPicker({
  controller,
}: {
  controller: PropertyHubSidePanelController
}) {
  const {
    contextMcId,
    selectedPropertyId,
    selectedPropertyLabel,
    selectPropertyFilter,
    clearPropertyFilter,
    closePicker,
  } = controller

  const bucketKey = useMemo(
    () => [...PROPERTY_OPTIONS_QUERY_KEY, contextMcId ?? "no-mc"] as const,
    [contextMcId],
  )

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchPropertyOptionsRequest(search, signal, {
        managementCompanyId: contextMcId ?? undefined,
        skip,
      }),
    [contextMcId],
  )

  const dropdown = useAsyncRichDropdownController<PropertyOption>({
    bucketKey,
    pagedSearchFn,
  })

  const handleSelect = useCallback(
    (option: HubSidePanelPickerOption) => {
      selectPropertyFilter(option.id, option.title)
    },
    [selectPropertyFilter],
  )

  return (
    <HubSidePanelPicker
      controller={dropdown}
      toOption={toPickerOption}
      selectedId={selectedPropertyId}
      selectedLabel={selectedPropertyLabel}
      onSelect={handleSelect}
      onClear={clearPropertyFilter}
      onCancel={closePicker}
      searchPlaceholder="Search properties"
      emptyMessage="No matches"
      loadingMessage="Searching…"
      clearLabel="Clear filter"
    />
  )
}
