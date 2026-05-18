"use client"

import { RecordFooterNeutralButton } from "@/components/panels/record-action-buttons"

export function WorkOrderCloseButton({
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
