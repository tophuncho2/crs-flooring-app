"use client"

import { useState } from "react"
import { ManagementCompanyDeleteWithConfirmation } from "./toolbar-controls/management-company-delete-with-confirmation"
import { ManagementCompanyCloseButton } from "./toolbar-controls/management-company-close-button"

export function ManagementCompanyRecordFooter({
  onClose,
  onDelete,
  deleteLabel = "Delete Company",
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
          <ManagementCompanyDeleteWithConfirmation
            label={deleteLabel}
            onConfirm={onDelete}
            onBusyChange={setIsBusy}
          />
        ) : null}
      </div>
      <div className="flex gap-2">
        <ManagementCompanyCloseButton label={closeLabel} onClose={onClose} disabled={isBusy} />
      </div>
    </div>
  )
}
