"use client"

import type { CellProps } from "./contracts/cell-base"
import { StatusBadge } from "../badges/status-badge"
import type { BadgeTone } from "../badges/contracts/badge-tone"

export type StatusCellProps = CellProps<string> & {
  /**
   * Tone for the badge. Distinct from `tone` on the base props (which would
   * tint the cell text); this drives the badge colour.
   */
  badgeTone?: BadgeTone
  /**
   * Optional formatter for the status label. Default: pass through `value`.
   */
  formatLabel?: (value: string) => string
}

/**
 * Renders the cell value as a `StatusBadge`. Always read-only — status cells
 * never accept inline edits; transitions happen via dedicated controllers.
 */
export function StatusCell(props: StatusCellProps) {
  const label = props.formatLabel ? props.formatLabel(props.value) : props.value
  return (
    <div className={["flex items-center justify-center", props.className].filter(Boolean).join(" ")}>
      <StatusBadge tone={props.badgeTone ?? "default"}>{label}</StatusBadge>
    </div>
  )
}
