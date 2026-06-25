"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ClearAllFiltersButton } from "../filter/clear-all-filters-button"
import { ListRowCount } from "../list-toolbar/list-row-count"

// The header slots live in the app-shell HeaderControls subtree, so they can
// only be located after mount. useSyncExternalStore reads them on the client
// (getServerSnapshot returns null, matching SSR) without a setState-in-effect
// cascade. getElementById returns the same node ref across renders, so this
// never loops. Mirrors ListCreateButtonPortal / RecordBackButtonPortal.
const META_SLOT_ID = "list-meta-slot"
const TOOLS_SLOT_ID = "list-tools-slot"

function subscribe(): () => void {
  return () => {}
}

function getServerSlot(): HTMLElement | null {
  return null
}

function useSlot(slotId: string): HTMLElement | null {
  return useSyncExternalStore(
    subscribe,
    () => document.getElementById(slotId),
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
 *   `#list-meta-slot`, in the header's left group after the record
 *   back-button/stepper slots. When a back button ever renders on a list page,
 *   the left group's flex order flows the meta cluster to its right for free.
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
  const metaSlot = useSlot(META_SLOT_ID)
  const toolsSlot = useSlot(TOOLS_SLOT_ID)

  return (
    <>
      {metaSlot
        ? createPortal(
            <div className="flex items-center gap-3">
              <span className="inline-block rounded-md border border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
                {label}
              </span>
              <ListRowCount count={rowCount} total={total} label={rowCountLabel} />
              <ClearAllFiltersButton hasActive={hasActiveFilters} onClick={onClearAll} />
            </div>,
            metaSlot,
          )
        : null}

      {toolsSlot && children
        ? createPortal(<div className="flex items-center gap-2">{children}</div>, toolsSlot)
        : null}
    </>
  )
}
