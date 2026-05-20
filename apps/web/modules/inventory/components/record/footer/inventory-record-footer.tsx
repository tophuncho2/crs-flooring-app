"use client"

import { useState } from "react"
import { InventoryDeleteWithConfirmation } from "./toolbar-controls/inventory-delete-with-confirmation"
import { InventoryCloseButton } from "./toolbar-controls/inventory-close-button"

export function InventoryRecordFooter({
  onClose,
  onDelete,
  deleteLabel = "Delete Inventory",
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
          <InventoryDeleteWithConfirmation
            label={deleteLabel}
            onConfirm={onDelete}
            onBusyChange={setIsBusy}
          />
        ) : null}
      </div>
      <div className="flex gap-2">
        <InventoryCloseButton label={closeLabel} onClose={onClose} disabled={isBusy} />
      </div>
    </div>
  )
}
