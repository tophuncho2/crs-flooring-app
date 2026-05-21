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
