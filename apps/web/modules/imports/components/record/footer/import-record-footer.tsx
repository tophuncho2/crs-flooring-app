"use client"

import { useState } from "react"
import { ImportDeleteWithConfirmation } from "./toolbar-controls/import-delete-with-confirmation"
import { ImportCloseButton } from "./toolbar-controls/import-close-button"

export function ImportRecordFooter({
  onClose,
  onDelete,
  deleteLabel = "Delete Import",
  closeLabel = "Close",
}: {
  onClose: () => void
  onDelete?: () => Promise<unknown>
  deleteLabel?: string
  closeLabel?: string
}) {
  const [isBusy, setIsBusy] = useState(false)

  return (
    <div className="mt-6 flex items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-4 py-3">
      <div className="flex gap-2">
        {onDelete ? (
          <ImportDeleteWithConfirmation
            label={deleteLabel}
            onConfirm={onDelete}
            onBusyChange={setIsBusy}
          />
        ) : null}
      </div>
      <div className="flex gap-2">
        <ImportCloseButton label={closeLabel} onClose={onClose} disabled={isBusy} />
      </div>
    </div>
  )
}
