"use client"

import { useCallback } from "react"
import type { ManagementCompanyOption } from "@builders/domain"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY,
  searchManagementCompanyOptionsRequest,
} from "@/modules/management-companies/data/management-company-options-request"
import {
  TemplateSyncOptionsPanel,
  type TemplateSyncOptionRow,
} from "@/modules/template-sync/components/template-sync-options-panel"

// Body-mode bump: the side-panel surface has room for the server cap of 50,
// while the popover-mode picker elsewhere stays at the default 20.
const BODY_MODE_TAKE = 50

function toOptionRow(option: ManagementCompanyOption): TemplateSyncOptionRow {
  return { id: option.id, title: option.name, subtitles: [] }
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
  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchManagementCompanyOptionsRequest(search, signal, BODY_MODE_TAKE),
    [],
  )

  const controller = useAsyncRichDropdownController<ManagementCompanyOption>({
    bucketKey: MANAGEMENT_COMPANY_OPTIONS_QUERY_KEY,
    searchFn,
  })

  return (
    <TemplateSyncOptionsPanel<ManagementCompanyOption>
      controller={controller}
      toOptionRow={toOptionRow}
      currentValue={currentValue}
      currentLabel={currentLabel}
      onSelect={onSelect}
      onCancel={onCancel}
      searchPlaceholder="Search companies"
    />
  )
}
