"use client"

import { useCallback, useMemo, useState } from "react"

/**
 * Trigger-summary glue for multi-select list-filter pickers — the many-id
 * sibling of {@link usePickedOptionLabel}.
 *
 * A multi-select filter chip stores its selection as `string[]` and renders a
 * summary trigger ("All" / one name / "N warehouses"). List-filter consumers
 * resolve labels from a frozen SSR seed, so an id picked via async search
 * (outside the seed) would filter the table but show no name. This hook keeps a
 * small id→label cache (seeded from SSR, topped up on each pick) and returns
 * labels aligned index-for-index to `values`.
 *
 * Lives in the always-mounted list client — the Filter popover unmounts on
 * close, taking any in-popover state with it. Pure render-time derivation: no
 * `useEffect`, no set-state-in-render. A re-seed (SSR nav) stays reactive
 * because the labels derive off the live `seedLabels` prop each render.
 */
export function useMultiPickedOptionLabels<T extends { id: string }>(
  values: string[],
  seedLabels: ReadonlyArray<{ id: string; label: string }>,
  labelOf: (option: T) => string,
): { labels: Array<string | null>; onOptionSelected: (option: T | null) => void } {
  const [picked, setPicked] = useState<Map<string, string>>(() => new Map())

  const onOptionSelected = useCallback(
    (option: T | null) => {
      if (!option) return
      setPicked((previous) => {
        const label = labelOf(option)
        if (previous.get(option.id) === label) return previous
        const next = new Map(previous)
        next.set(option.id, label)
        return next
      })
    },
    [labelOf],
  )

  const seedMap = useMemo(
    () => new Map(seedLabels.map((entry) => [entry.id, entry.label])),
    [seedLabels],
  )

  // `|| null` coerces an empty label to `null` so the summary treats it as
  // "no name yet" rather than a blank-but-present label (mirrors the single hook).
  const labels = useMemo(
    () => values.map((id) => (picked.get(id) ?? seedMap.get(id) ?? "") || null),
    [values, picked, seedMap],
  )

  return { labels, onOptionSelected }
}
