"use client"

import { Copy } from "lucide-react"
import { CellActionButton } from "@/engines/common"

export type StagedRowDuplicateButtonProps = {
  isEditable: boolean
  isSectionBusy: boolean
  onClick: () => void
}

/** Gutter duplicate for a staged-inventory row (any state except QUEUED) — common neutral preset. */
export function StagedRowDuplicateButton({
  isEditable,
  isSectionBusy,
  onClick,
}: StagedRowDuplicateButtonProps) {
  const enabled = isEditable && !isSectionBusy
  return (
    <CellActionButton
      onClick={onClick}
      disabled={!enabled}
      tone="neutral"
      icon={<Copy size={14} aria-hidden="true" />}
      ariaLabel="Duplicate staged row"
      title={isEditable ? "Duplicate this row" : "Queued rows can't be duplicated"}
    />
  )
}
