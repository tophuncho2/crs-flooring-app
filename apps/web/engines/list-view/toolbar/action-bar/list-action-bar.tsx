"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ClearAllFiltersButton } from "./clear-all-filters-button"
import { ListHeaderPortal } from "./list-header-portal"

// The tools slot lives in the app-shell HeaderControls subtree, so it can only
// be located after mount. useSyncExternalStore reads it on the client
// (getServerSnapshot returns null, matching SSR) without a setState-in-effect
// cascade. getElementById returns the same node ref across renders, so this
// never loops. The meta cluster portals through ListHeaderPortal.
const TOOLS_SLOT_ID = "list-tools-slot"

function subscribe(): () => void {
  return () => {}
}

function getServerSlot(): HTMLElement | null {
  return null
}

function useToolsSlot(): HTMLElement | null {
  return useSyncExternalStore(
    subscribe,
    () => document.getElementById(TOOLS_SLOT_ID),
    getServerSlot,
  )
}

export type ListActionBarProps = {
  /** Module label shown in the top-left blue tag (e.g. "Job Types"). */
  label: string
  /** Rows currently shown. */
  rowCount: number
  /** Total matching rows. */
  total: number
  /** Plural noun for the count (e.g. "job types"). */
  rowCountLabel: string
  /** Whether any search/filter is active (drives the Clear-all button). */
  hasActiveFilters: boolean
  /** Clears all search + filters. */
  onClearAll: () => void
  /** Right-anchored tool buttons (Sort → Filter → Search, left-to-right). */
  children?: ReactNode
}

/**
 * List header chrome, portaled into the app-shell header strip — the caged
 * replacement for the old in-page toolbar card. Renders nothing in place:
 *
 * - The meta cluster (module label + row count + Clear-all) lands in
 *   `#list-meta-slot` via {@link ListHeaderPortal}, in the header's left group
 *   after the record back-button/stepper slots. When a back button ever renders
 *   on a list page, the left group's flex order flows the meta cluster to its
 *   right for free.
 * - The tool buttons (`children`) land in `#list-tools-slot`, in the header's
 *   right group directly left of the `#page-action-slot` "+ Create" button, so
 *   the create action sits inline with the tools.
 *
 * Portals keep both clusters in the consuming page-client's React tree (their
 * controller wiring stays intact); only the DOM relocates into the header. The
 * data table sits directly beneath the freed page-top space.
 *
 * Stays in the cage: app-shell owns the empty slot divs; this engine portals
 * into them by string ID with no import either way.
 */
export function ListActionBar({
  label,
  rowCount,
  total,
  rowCountLabel,
  hasActiveFilters,
  onClearAll,
  children,
}: ListActionBarProps) {
  const toolsSlot = useToolsSlot()

  return (
    <>
      <ListHeaderPortal
        label={label}
        rowCount={rowCount}
        total={total}
        rowCountLabel={rowCountLabel}
        trailing={<ClearAllFiltersButton hasActive={hasActiveFilters} onClick={onClearAll} />}
      />

      {toolsSlot && children
        ? createPortal(<div className="flex items-center gap-2">{children}</div>, toolsSlot)
        : null}
    </>
  )
}
