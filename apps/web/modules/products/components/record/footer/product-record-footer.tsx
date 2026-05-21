"use client"

import { useState } from "react"
import { ProductDeleteWithConfirmation } from "./toolbar-controls/product-delete-with-confirmation"
import { ProductCloseButton } from "./toolbar-controls/product-close-button"

export function ProductRecordFooter({
  onClose,
  onDelete,
  deleteLabel = "Delete Product",
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
          <ProductDeleteWithConfirmation
            label={deleteLabel}
            onConfirm={onDelete}
            onBusyChange={setIsBusy}
          />
        ) : null}
      </div>
      <div className="flex gap-2">
        <ProductCloseButton label={closeLabel} onClose={onClose} disabled={isBusy} />
      </div>
    </div>
  )
}
