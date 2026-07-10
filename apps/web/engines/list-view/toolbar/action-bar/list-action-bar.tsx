"use client"

import { type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ClearAllFiltersButton } from "./clear-all-filters-button"
import { ListHeaderPortal } from "./list-header-portal"
import { usePortalSlot } from "./use-portal-slot"

// The tools slot lives in the app-shell HeaderControls subtree; usePortalSlot
// resolves it SSR-safely after mount. The meta cluster portals through
// ListHeaderPortal.
const TOOLS_SLOT_ID = "list-tools-slot"

export type ListActionBarProps = {
  /** Module label shown in the top-left blue tag (e.g. "Job Types"). */
  label: string
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
 * - The meta cluster (just the module label) lands in `#list-meta-slot` via
 *   {@link ListHeaderPortal}, in the header's left group after the record
 *   back-button/stepper slots. When a back button ever renders on a list page,
 *   the left group's flex order flows the meta cluster to its right for free.
 * - The tool buttons (`children`) plus the trailing Clear-all button land in
 *   `#list-tools-slot`, in the header's right group directly left of the
 *   `#page-action-slot` "+ Create" button, so Clear-all sits rightmost in the
 *   tool cluster, immediately left of the create action.
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
  hasActiveFilters,
  onClearAll,
  children,
}: ListActionBarProps) {
  const toolsSlot = usePortalSlot(TOOLS_SLOT_ID)

  return (
    <>
      <ListHeaderPortal label={label} />

      {toolsSlot && (children || hasActiveFilters)
        ? createPortal(
            <div className="flex items-center gap-2">
              {children}
              <ClearAllFiltersButton hasActive={hasActiveFilters} onClick={onClearAll} />
            </div>,
            toolsSlot,
          )
        : null}
    </>
  )
}
