"use client"

import { createPortal } from "react-dom"
import { usePortalSlot } from "./use-portal-slot"

// The slot lives in the app-shell HeaderControls subtree; usePortalSlot resolves
// it SSR-safely after mount.
const SLOT_ID = "page-action-slot"

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
  const target = usePortalSlot(SLOT_ID)

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
