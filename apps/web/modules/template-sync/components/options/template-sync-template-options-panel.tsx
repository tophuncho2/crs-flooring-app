"use client"

import { useCallback, useMemo } from "react"
import type { TemplateOption } from "@builders/domain"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  TEMPLATE_OPTIONS_QUERY_KEY,
  searchTemplateOptionsRequest,
} from "@/modules/templates/data/template-options-request"
import {
  TemplateSyncOptionsPanel,
  type TemplateSyncOptionRow,
} from "@/modules/template-sync/components/template-sync-options-panel"

function toOptionRow(option: TemplateOption): TemplateSyncOptionRow {
  const subtitles = option.description ? [option.description] : []
  return { id: option.id, title: option.unitType || "—", subtitles }
}

export type TemplateSyncTemplateOptionsPanelProps = {
  propertyId: string
  currentValue: string | null
  currentLabel: string | null
  onSelect: (option: TemplateOption | null) => void
  onCancel: () => void
}

export function TemplateSyncTemplateOptionsPanel({
  propertyId,
  currentValue,
  currentLabel,
  onSelect,
  onCancel,
}: TemplateSyncTemplateOptionsPanelProps) {
  const bucketKey = useMemo(
    () => [...TEMPLATE_OPTIONS_QUERY_KEY, propertyId] as const,
    [propertyId],
  )

  const pagedSearchFn = useCallback(
    (search: string, signal: AbortSignal | undefined, skip: number) =>
      searchTemplateOptionsRequest(search, signal, {
        propertyId,
        skip,
      }),
    [propertyId],
  )

  const controller = useAsyncRichDropdownController<TemplateOption>({
    bucketKey,
    pagedSearchFn,
  })

  return (
    <TemplateSyncOptionsPanel<TemplateOption>
      controller={controller}
      toOptionRow={toOptionRow}
      currentValue={currentValue}
      currentLabel={currentLabel}
      onSelect={onSelect}
      onCancel={onCancel}
      searchPlaceholder="Search templates"
    />
  )
}
