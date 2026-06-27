"use client"

import { Copy } from "lucide-react"
import { CellActionButton } from "@/engines/common"

export type StagedRowDuplicateButtonProps = {
  isDraft: boolean
  isSectionBusy: boolean
  onClick: () => void
}

/** Gutter duplicate for a staged-inventory row (DRAFT only) — common neutral preset. */
export function StagedRowDuplicateButton({
  isDraft,
  isSectionBusy,
  onClick,
}: StagedRowDuplicateButtonProps) {
  const enabled = isDraft && !isSectionBusy
  return (
    <CellActionButton
      onClick={onClick}
      disabled={!enabled}
      tone="neutral"
      icon={<Copy size={14} aria-hidden="true" />}
      ariaLabel="Duplicate staged row"
      title={isDraft ? "Duplicate this row" : "Only draft rows can be duplicated"}
    />
  )
}
