"use client"

import { useCallback, useMemo } from "react"
import type { ManagementCompanyOption } from "@builders/domain"
import { HubSidePanelPicker, type HubSidePanelPickerOption } from "@/components/hub-side-panel"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY,
  searchManagementCompanyOptionsRequest,
} from "@/modules/management-companies/data/management-company-options-request"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

function toPickerOption(option: ManagementCompanyOption): HubSidePanelPickerOption {
  return { id: option.id, title: option.name, subtitle: null }
}

/**
 * Inline-in-body MC link picker, shown during the hub-create flow when the
 * user opens the "Link existing company" picker. Selecting a row writes the
 * picked MC into the create draft and pops the panel back to the create
 * mode.
 */
export function PropertyHubMcLinkPicker({
  controller,
}: {
  controller: PropertyHubSidePanelController
}) {
  const { mcLinkId, mcLinkLabel, setMcLink, closePicker } = controller

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchManagementCompanyOptionsRequest(search, signal, { skip }),
    [],
  )

  const dropdown = useAsyncRichDropdownController<ManagementCompanyOption>({
    bucketKey: MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY,
    pagedSearchFn,
  })

  const handleSelect = useCallback(
    (option: HubSidePanelPickerOption) => {
      setMcLink(option.id, option.title)
      closePicker()
    },
    [setMcLink, closePicker],
  )

  const handleClear = useCallback(() => {
    setMcLink(null, null)
    closePicker()
  }, [setMcLink, closePicker])

  const toOption = useMemo(() => toPickerOption, [])

  return (
    <HubSidePanelPicker
      controller={dropdown}
      toOption={toOption}
      selectedId={mcLinkId}
      selectedLabel={mcLinkLabel}
      onSelect={handleSelect}
      onClear={handleClear}
      onCancel={closePicker}
      searchPlaceholder="Search companies"
      emptyMessage="No matches"
      loadingMessage="Searching…"
      clearLabel="Clear selection"
    />
  )
}
