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

const BODY_MODE_TAKE = 50

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

  const searchFn = useCallback(
    (search: string, signal: AbortSignal | undefined) =>
      searchTemplateOptionsRequest(search, signal, {
        propertyId,
        take: BODY_MODE_TAKE,
      }),
    [propertyId],
  )

  const controller = useAsyncRichDropdownController<TemplateOption>({
    bucketKey,
    searchFn,
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
