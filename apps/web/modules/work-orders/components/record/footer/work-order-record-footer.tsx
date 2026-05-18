"use client"

import { useState } from "react"
import { WorkOrderDeleteWithConfirmation } from "./toolbar-controls/work-order-delete-with-confirmation"
import { WorkOrderCloseButton } from "./toolbar-controls/work-order-close-button"

export function WorkOrderRecordFooter({
  onClose,
  onDelete,
  deleteLabel = "Delete Work Order",
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
          <WorkOrderDeleteWithConfirmation
            label={deleteLabel}
            onConfirm={onDelete}
            onBusyChange={setIsBusy}
          />
        ) : null}
      </div>
      <div className="flex gap-2">
        <WorkOrderCloseButton label={closeLabel} onClose={onClose} disabled={isBusy} />
      </div>
    </div>
  )
}
