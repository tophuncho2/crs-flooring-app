"use client"

import { Plus } from "lucide-react"
import { RowActionButton } from "@/engines/record-view"

export type MaterialItemCreateAdjustmentButtonProps = {
  /** Enabled only when the row names a product to pre-seed the modal filter. */
  enabled: boolean
  onClick: () => void
}

/**
 * Opens the adjustment create modal pre-filtered to this requested row's product
 * (the work order's warehouse seeds the inventory picker). Lets an operator pull
 * material for a requested line without leaving the Requested Material view —
 * independent of saving the material item, so it stays live during a section save
 * and only disables when the row has no product yet.
 */
export function MaterialItemCreateAdjustmentButton({
  enabled,
  onClick,
}: MaterialItemCreateAdjustmentButtonProps) {
  return (
    <RowActionButton
      label={<Plus size={14} aria-hidden="true" />}
      ariaLabel="Create adjustment for this product"
      tone="neutral"
      title={enabled ? "Create an adjustment for this product" : "Pick a product first"}
      editable={enabled}
      onClick={onClick}
    />
  )
}
