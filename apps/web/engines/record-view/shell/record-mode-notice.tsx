"use client"

import type { ReactNode } from "react"
import { useSyncExternalStore } from "react"
import { createPortal } from "react-dom"

const SLOT_ID = "record-mode-notice-slot"

type RecordMode = "form" | "edit"

// Unified to the edit-mode green across every view (form, edit, and list).
const RECORD_MODE_NOTICE_CLASS_NAME: Record<RecordMode, string> = {
  form: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600",
  edit: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600",
}

export function RecordModeNotice({
  mode,
  children,
}: {
  mode: RecordMode
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${RECORD_MODE_NOTICE_CLASS_NAME[mode]}`}
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

export function RecordModeNoticePortal({
  mode,
  label,
}: {
  mode: RecordMode
  label: string
}) {
  const target = useSyncExternalStore(subscribe, getSlot, getServerSlot)

  if (!target) return null

  const text = `${label} ${mode === "form" ? "Form" : "Edit"}`

  return createPortal(<RecordModeNotice mode={mode}>{text}</RecordModeNotice>, target)
}
