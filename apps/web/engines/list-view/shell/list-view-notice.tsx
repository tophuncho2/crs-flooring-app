"use client"

import type { ReactNode } from "react"
import { useSyncExternalStore } from "react"
import { createPortal } from "react-dom"

const SLOT_ID = "list-view-notice-slot"

// Unified to the record-view edit-mode green across every view.
const LIST_VIEW_NOTICE_CLASS_NAME = "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"

export function ListViewNotice({ children }: { children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${LIST_VIEW_NOTICE_CLASS_NAME}`}
    >
      {children}
    </span>
  )
}

// The slot is owned by another subtree, so it can only be located after mount.
// useSyncExternalStore reads it on the client (getServerSnapshot returns null,
// matching SSR) without a synchronous setState-in-effect cascade. The slot
// reference is stable across renders, so this never loops.
function subscribe(): () => void {
  return () => {}
}

function getSlot(): HTMLElement | null {
  return document.getElementById(SLOT_ID)
}

function getServerSlot(): HTMLElement | null {
  return null
}

export function ListViewNoticePortal({ label }: { label: string }) {
  const target = useSyncExternalStore(subscribe, getSlot, getServerSlot)

  if (!target) return null

  return createPortal(<ListViewNotice>{`${label} List`}</ListViewNotice>, target)
}
