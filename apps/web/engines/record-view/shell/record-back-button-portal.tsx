"use client"

import { useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { RecordBackButton } from "@/components/panels/record-action-buttons"

const SLOT_ID = "record-back-button-slot"

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

export function RecordBackButtonPortal({
  backHref,
  onBack,
  backLabel = "Back",
}: {
  backHref: string
  onBack?: () => void
  backLabel?: string
}) {
  const target = useSyncExternalStore(subscribe, getSlot, getServerSlot)

  if (!target) return null

  const button = onBack ? (
    <RecordBackButton onClick={onBack} label={backLabel} />
  ) : (
    <RecordBackButton href={backHref} label={backLabel} />
  )

  return createPortal(button, target)
}
