"use client"

import { RecordFooterNeutralButton } from "@/engines/record-view"

export function ProductCloseButton({
  label = "Close",
  disabled = false,
  onClose,
}: {
  label?: string
  disabled?: boolean
  onClose: () => void
}) {
  return (
    <RecordFooterNeutralButton onClick={onClose} disabled={disabled}>
      {label}
    </RecordFooterNeutralButton>
  )
}
