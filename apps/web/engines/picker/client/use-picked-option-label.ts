"use client"

import { useCallback, useState } from "react"

/**
 * Trigger-label glue for list-filter pickers.
 *
 * `PickerTrigger` derives its label ONLY from `selectedLabel` (never from
 * `value`), and list-filter consumers otherwise resolve that label from a
 * frozen SSR seed — so a value picked via async search (outside the seed)
 * filters the table but shows a blank trigger. This hook captures the picked
 * option (fed by the picker's `onOptionSelected`) and derives `selectedLabel`
 * from it, falling back to the seed label whenever `value` no longer matches
 * the last pick.
 *
 * Pure render-time derivation — no `useEffect`, no set-state-in-render, no ref.
 * The `value`-guard shadows a stale pick automatically, so a clear, a
 * cascade-clear routed through a sibling filter, or an external URL/clear-all
 * nav all resolve correctly for free. This is the repo's preferred label
 * pattern (see `entity-picker-label-contract`); the render-time seen-tracker
 * idiom is only for the record-swap case, which list filters don't have.
 */
export function usePickedOptionLabel<T extends { id: string }>(
  value: string | null,
  seedLabel: string | null,
  labelOf: (option: T) => string,
): { selectedLabel: string | null; onOptionSelected: (option: T | null) => void } {
  const [picked, setPicked] = useState<{ id: string; label: string } | null>(null)

  const onOptionSelected = useCallback(
    (option: T | null) => {
      setPicked(option ? { id: option.id, label: labelOf(option) } : null)
    },
    [labelOf],
  )

  // `|| null` coerces an empty label (e.g. a template with a blank unitType) to
  // the placeholder — PickerTrigger treats "" as "has value" and would render a
  // blank-but-not-placeholder trigger otherwise.
  const selectedLabel = (picked && picked.id === value ? picked.label : seedLabel) || null

  return { selectedLabel, onOptionSelected }
}
