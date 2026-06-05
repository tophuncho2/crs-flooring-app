"use client"

import { HubSidePanelPicker } from "@/components/hub-side-panel"
import { useAsyncRichDropdownController } from "@/engines/dropdowns"
import type { CascadePickerStepConfig } from "../contracts/cascade-picker-contracts"

export type CascadePickerOptionsPanelProps<TOption> = {
  step: CascadePickerStepConfig<TOption>
  currentValue: string | null
  currentLabel: string | null
  onSelect: (option: TOption | null) => void
  onCancel: () => void
}

/**
 * Generic expanded-options panel for one cascade step. Wraps the dropdown
 * engine's async controller + the shared side-panel picker chrome; the step's
 * `bucketKey` / `pagedSearchFn` / `toOption` come from the consumer's wiring.
 */
export function CascadePickerOptionsPanel<TOption>({
  step,
  currentValue,
  currentLabel,
  onSelect,
  onCancel,
}: CascadePickerOptionsPanelProps<TOption>) {
  const controller = useAsyncRichDropdownController<TOption>({
    bucketKey: step.bucketKey,
    pagedSearchFn: step.pagedSearchFn,
  })

  return (
    <HubSidePanelPicker<TOption>
      controller={controller}
      toOption={step.toOption}
      selectedId={currentValue}
      selectedLabel={currentLabel}
      onSelect={(_option, raw) => onSelect(raw)}
      onClear={() => onSelect(null)}
      onCancel={onCancel}
      searchPlaceholder={step.searchPlaceholder}
    />
  )
}
