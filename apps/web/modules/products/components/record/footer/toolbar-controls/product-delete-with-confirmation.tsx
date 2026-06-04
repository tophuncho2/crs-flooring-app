"use client"

import { useState } from "react"
import { RecordFooterDestructiveButton } from "@/engines/record-view"
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog"

export function ProductDeleteWithConfirmation({
  label,
  disabled = false,
  onConfirm,
  onBusyChange,
}: {
  label: string
  disabled?: boolean
  onConfirm: () => Promise<unknown>
  onBusyChange?: (isBusy: boolean) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  function setBusy(value: boolean) {
    setIsConfirming(value)
    onBusyChange?.(value)
  }

  function openDialog() {
    if (disabled || isConfirming) return
    setIsOpen(true)
  }

  function cancel() {
    if (isConfirming) return
    setIsOpen(false)
  }

  async function confirm() {
    if (isConfirming) return
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      setIsOpen(false)
    }
  }

  return (
    <>
      <RecordFooterDestructiveButton onClick={openDialog} disabled={disabled || isConfirming}>
        {label}
      </RecordFooterDestructiveButton>
      <ConfirmDialog
        open={isOpen}
        title="Delete product?"
        message="This cannot be undone."
        confirmLabel={isConfirming ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        tone="destructive"
        onConfirm={() => void confirm()}
        onCancel={cancel}
      />
    </>
  )
}
