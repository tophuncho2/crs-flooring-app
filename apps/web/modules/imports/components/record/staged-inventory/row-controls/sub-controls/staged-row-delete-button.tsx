"use client"

import { RowActionButton } from "@/engines/record-view"

export type StagedRowDeleteButtonProps = {
  isDraft: boolean
  isSectionBusy: boolean
  onClick: () => void
}

export function StagedRowDeleteButton({
  isDraft,
  isSectionBusy,
  onClick,
}: StagedRowDeleteButtonProps) {
  return (
    <RowActionButton
      label={<TrashIcon />}
      ariaLabel="Delete row"
      tone="destructive"
      editable={isDraft && !isSectionBusy}
      title={isDraft ? "Delete this row" : "Only draft rows can be deleted"}
      onClick={onClick}
    />
  )
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
