"use client"

import { RowActionButton } from "../../cells/row-action-button"
import type { EditabilityContract } from "../../grid/contracts/grid-editability"

export type DuplicateRowButtonProps = EditabilityContract & {
  /** Click handler — fired only when `editable: true`. */
  onClick: () => void
  /** Required for accessibility, e.g. "Duplicate material item 3". */
  ariaLabel: string
  /** Optional tooltip — useful for the disabled state. */
  title?: string
}

/**
 * Canonical Duplicate row-action button. Renders the project's copy glyph
 * inside a neutral-tone `RowActionButton`. Place inside a grid trailing-
 * control cell; pair with other row-action buttons (delete, void) as needed.
 */
export function DuplicateRowButton({
  onClick,
  ariaLabel,
  title,
  ...editability
}: DuplicateRowButtonProps) {
  return (
    <RowActionButton
      label={<DuplicateIcon />}
      ariaLabel={ariaLabel}
      title={title}
      tone="neutral"
      onClick={onClick}
      {...editability}
    />
  )
}

function DuplicateIcon() {
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
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
