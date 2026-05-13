"use client"

import { useCallback, useState } from "react"

export type ExpandableRowsToggle = {
  /** True when every sub-row section is visible. Drives `<ExpandToggle expanded={…} />`. */
  allExpanded: boolean
  /** Flip between expand-all and collapse-all. The only path that mutates state. */
  toggleAll: () => void
}

/**
 * Shared coarse expand-all / collapse-all controller for sub-row sections
 * (staged-inv filter rows, WO material items). Both sections operate in
 * all-or-nothing mode — no per-row expand state — so this hook codifies
 * that with a single boolean.
 *
 * Defaults to **expanded** so operators see child content on first render
 * and must explicitly collapse. State flips ONLY on a `toggleAll()` call;
 * section saves, server refreshes, and row-set changes do NOT reset it.
 * The previous per-section implementations derived `allExpanded` from
 * `expandedRowIds.size === items.length`, which incidentally flipped to
 * `false` whenever the items array changed identity (e.g. on save) —
 * surprising to operators. This hook removes that coupling.
 */
export function useExpandableRowsToggle(): ExpandableRowsToggle {
  const [allExpanded, setAllExpanded] = useState(true)
  const toggleAll = useCallback(() => setAllExpanded((prev) => !prev), [])
  return { allExpanded, toggleAll }
}
