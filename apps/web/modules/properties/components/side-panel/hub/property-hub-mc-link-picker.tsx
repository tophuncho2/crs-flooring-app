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
 * Inline-in-body MC link picker. Serves two callers via the controller's
 * `commitMcLink` dispatch: the create flow (writes the link into the
 * create draft) and the property-edit flow (writes the link into the
 * property edit form). The picker doesn't need to know which.
 */
export function PropertyHubMcLinkPicker({
  controller,
}: {
  controller: PropertyHubSidePanelController
}) {
  const { mcLinkSelectedId, mcLinkSelectedLabel, commitMcLink, closePicker } = controller

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
      commitMcLink(option.id, option.title)
    },
    [commitMcLink],
  )

  const handleClear = useCallback(() => {
    commitMcLink(null, null)
  }, [commitMcLink])

  const toOption = useMemo(() => toPickerOption, [])

  return (
    <HubSidePanelPicker
      controller={dropdown}
      toOption={toOption}
      selectedId={mcLinkSelectedId}
      selectedLabel={mcLinkSelectedLabel}
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
