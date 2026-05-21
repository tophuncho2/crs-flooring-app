"use client"

import { useCallback, useMemo } from "react"
import type { PropertyOption } from "@builders/domain"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  PROPERTY_OPTIONS_QUERY_KEY,
  searchPropertyOptionsRequest,
} from "@/modules/properties/data/property-options-request"
import {
  TemplateSyncOptionsPanel,
  type TemplateSyncOptionRow,
} from "@/modules/template-sync/components/template-sync-options-panel"

function toOptionRow(option: PropertyOption): TemplateSyncOptionRow {
  const subtitles = option.address ? [option.address] : []
  return { id: option.id, title: option.name, subtitles }
}

export type TemplateSyncPropertyOptionsPanelProps = {
  managementCompanyId: string | null
  currentValue: string | null
  currentLabel: string | null
  onSelect: (option: PropertyOption | null) => void
  onCancel: () => void
}

export function TemplateSyncPropertyOptionsPanel({
  managementCompanyId,
  currentValue,
  currentLabel,
  onSelect,
  onCancel,
}: TemplateSyncPropertyOptionsPanelProps) {
  // Bucket per management-company so cache results stay scoped to the parent
  // filter — same shape as PropertyPicker's popover-mode controller.
  const bucketKey = useMemo(
    () => [...PROPERTY_OPTIONS_QUERY_KEY, managementCompanyId ?? null] as const,
    [managementCompanyId],
  )

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchPropertyOptionsRequest(search, signal, {
        managementCompanyId: managementCompanyId ?? undefined,
        skip,
      }),
    [managementCompanyId],
  )

  const controller = useAsyncRichDropdownController<PropertyOption>({
    bucketKey,
    pagedSearchFn,
  })

  return (
    <TemplateSyncOptionsPanel<PropertyOption>
      controller={controller}
      toOptionRow={toOptionRow}
      currentValue={currentValue}
      currentLabel={currentLabel}
      onSelect={onSelect}
      onCancel={onCancel}
      searchPlaceholder="Search properties"
    />
  )
}
