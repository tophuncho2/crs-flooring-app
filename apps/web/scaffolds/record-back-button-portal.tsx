"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { RecordBackButton } from "@/components/panels/record-action-buttons"

export function RecordBackButtonPortal({
  backHref,
  onBack,
  backLabel = "Back",
}: {
  backHref: string
  onBack?: () => void
  backLabel?: string
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setTarget(document.getElementById("record-back-button-slot"))
  }, [])

  if (!target) return null

  const button = onBack ? (
    <RecordBackButton onClick={onBack} label={backLabel} />
  ) : (
    <RecordBackButton href={backHref} label={backLabel} />
  )

  return createPortal(button, target)
}
