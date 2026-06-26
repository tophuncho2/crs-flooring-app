"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ListRowCount } from "./list-row-count"

// The meta slot lives in the app-shell HeaderControls subtree, so it can only be
// located after mount. useSyncExternalStore reads it on the client
// (getServerSnapshot returns null, matching SSR) without a setState-in-effect
// cascade. getElementById returns the same node ref across renders, so this
// never loops. Mirrors ListCreateButtonPortal / RecordBackButtonPortal.
const META_SLOT_ID = "list-meta-slot"

function subscribe(): () => void {
  return () => {}
}

function getServerSlot(): HTMLElement | null {
  return null
}

function useMetaSlot(): HTMLElement | null {
  return useSyncExternalStore(
    subscribe,
    () => document.getElementById(META_SLOT_ID),
    getServerSlot,
  )
}

export type ListHeaderPortalProps = {
  /** Module label shown in the top-left blue tag (e.g. "Job Types"). */
  label: string
  /** Rows currently shown. Omit (with `total`) on label-only read-only pages. */
  rowCount?: number
  /** Total matching rows. */
  total?: number
  /** Plural noun for the count (e.g. "job types"). */
  rowCountLabel?: string
  /** Trailing meta-cluster node (e.g. the Clear-all button on filtered lists). */
  trailing?: ReactNode
}

/**
 * The list-page meta cluster — module label + optional row count + optional
 * trailing control — portaled into the app-shell header's `#list-meta-slot`.
 * Renders nothing in place: every list page routes its label through here so the
 * blue tag lands in the header strip identically, whether the page has a toolbar
 * (driven by {@link ListActionBar}) or is a bare read-only catalog.
 *
 * The label tag's type scale lives here once, so a bump propagates to every page.
 * Stays in the cage: app-shell owns the empty slot div; this engine portals into
 * it by string ID with no import either way.
 */
export function ListHeaderPortal({
  label,
  rowCount,
  total,
  rowCountLabel,
  trailing,
}: ListHeaderPortalProps) {
  const metaSlot = useMetaSlot()
  if (!metaSlot) return null

  const showCount =
    rowCount !== undefined && total !== undefined && rowCountLabel !== undefined

  return createPortal(
    <div className="flex items-center gap-3">
      <span className="inline-block rounded-md border border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-sm font-bold text-black">
        {label}
      </span>
      {showCount ? (
        <ListRowCount count={rowCount} total={total} label={rowCountLabel} />
      ) : null}
      {trailing}
    </div>,
    metaSlot,
  )
}
