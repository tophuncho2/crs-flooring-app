"use client"

import { useState } from "react"
import { TemplateDeleteWithConfirmation } from "./toolbar-controls/template-delete-with-confirmation"
import { TemplateCloseButton } from "./toolbar-controls/template-close-button"

export function TemplateRecordFooter({
  onClose,
  onDelete,
  deleteLabel = "Delete Template",
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
          <TemplateDeleteWithConfirmation
            label={deleteLabel}
            onConfirm={onDelete}
            onBusyChange={setIsBusy}
          />
        ) : null}
      </div>
      <div className="flex gap-2">
        <TemplateCloseButton label={closeLabel} onClose={onClose} disabled={isBusy} />
      </div>
    </div>
  )
}
