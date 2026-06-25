"use client"

import { useSyncExternalStore } from "react"
import { createPortal } from "react-dom"

// The slot lives in the app-shell HeaderControls subtree, so it can only be
// located after mount. useSyncExternalStore reads it on the client
// (getServerSnapshot returns null, matching SSR) without a setState-in-effect
// cascade. The slot reference is stable across renders, so this never loops.
const SLOT_ID = "page-action-slot"

function subscribe(): () => void {
  return () => {}
}

function getSlot(): HTMLElement | null {
  return document.getElementById(SLOT_ID)
}

function getServerSlot(): HTMLElement | null {
  return null
}

const BUTTON_CLASS_NAME =
  "inline-flex items-center gap-1 rounded-md border border-sky-600 bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"

export type ListCreateButtonPortalProps = {
  /** Singular noun for the create action (e.g. "Job Type" → "+ Job Type"). */
  label: string
  onClick: () => void
  disabled?: boolean
}

/**
 * Portals a list view's primary create button into the screen-top-right
 * `page-action-slot` (in app-shell HeaderControls), mirroring
 * `RecordBackButtonPortal`. One standardized button style across every list
 * view, anchored at the screen corner rather than inline in the toolbar.
 */
export function ListCreateButtonPortal({
  label,
  onClick,
  disabled,
}: ListCreateButtonPortalProps) {
  const target = useSyncExternalStore(subscribe, getSlot, getServerSlot)

  if (!target) return null

  return createPortal(
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={BUTTON_CLASS_NAME}
    >
      + {label}
    </button>,
    target,
  )
}
