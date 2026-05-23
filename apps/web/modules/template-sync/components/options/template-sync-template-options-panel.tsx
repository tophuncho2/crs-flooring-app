"use client"

import { useCallback, useMemo } from "react"
import type { TemplateOption } from "@builders/domain"
import { useAsyncRichDropdownController } from "@/controllers/dropdown-search"
import {
  TEMPLATE_OPTIONS_QUERY_KEY,
  searchTemplateOptionsRequest,
} from "@/modules/templates/data/template-options-request"
import {
  HubSidePanelPicker,
  type HubSidePanelPickerOption,
} from "@/components/hub-side-panel"

function toOption(option: TemplateOption): HubSidePanelPickerOption {
  return {
    id: option.id,
    title: option.unitType || "—",
    subtitle: option.description || null,
  }
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
    <HubSidePanelPicker<TemplateOption>
      controller={controller}
      toOption={toOption}
      selectedId={currentValue}
      selectedLabel={currentLabel}
      onSelect={(_option, raw) => onSelect(raw)}
      onClear={() => onSelect(null)}
      onCancel={onCancel}
      searchPlaceholder="Search templates"
    />
  )
}
