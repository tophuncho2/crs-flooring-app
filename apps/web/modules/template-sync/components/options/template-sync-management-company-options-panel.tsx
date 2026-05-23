"use client"

import { useCallback } from "react"
import type { ManagementCompanyOption } from "@builders/domain"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY,
  searchManagementCompanyOptionsRequest,
} from "@/modules/management-companies/data/management-company-options-request"
import {
  HubSidePanelPicker,
  type HubSidePanelPickerOption,
} from "@/components/hub-side-panel"

function toOption(option: ManagementCompanyOption): HubSidePanelPickerOption {
  return { id: option.id, title: option.name }
}

export type TemplateSyncManagementCompanyOptionsPanelProps = {
  currentValue: string | null
  currentLabel: string | null
  onSelect: (option: ManagementCompanyOption | null) => void
  onCancel: () => void
}

export function TemplateSyncManagementCompanyOptionsPanel({
  currentValue,
  currentLabel,
  onSelect,
  onCancel,
}: TemplateSyncManagementCompanyOptionsPanelProps) {
  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchManagementCompanyOptionsRequest(search, signal, { skip }),
    [],
  )

  const controller = useAsyncRichDropdownController<ManagementCompanyOption>({
    bucketKey: MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY,
    pagedSearchFn,
  })

  return (
    <HubSidePanelPicker<ManagementCompanyOption>
      controller={controller}
      toOption={toOption}
      selectedId={currentValue}
      selectedLabel={currentLabel}
      onSelect={(_option, raw) => onSelect(raw)}
      onClear={() => onSelect(null)}
      onCancel={onCancel}
      searchPlaceholder="Search companies"
    />
  )
}
