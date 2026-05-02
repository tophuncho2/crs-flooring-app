"use client"

import { formatCutLogStatus, type FlooringCutLogStatus } from "@builders/domain"
import type { BadgeTone } from "./contracts/badge-tone"
import { StatusBadge } from "./status-badge"

const TONE_BY_STATUS: Record<FlooringCutLogStatus, BadgeTone> = {
  PENDING: "warning",
  QUEUED: "processing",
  FINAL: "success",
  VOID: "muted",
}

export type CutLogStatusBadgeProps = {
  status: FlooringCutLogStatus
  className?: string
}

/**
 * Cut-log status pill. Single source for the status → tone mapping that was
 * previously duplicated in the work-orders cut-log row and the inventory
 * cut-log section. Composes the generic `StatusBadge` with the cut-log
 * vocabulary; the human label comes from `formatCutLogStatus` in the domain.
 *
 * The status → tone mapping is itself a UI presentation choice (not a domain
 * rule), so it lives here next to the badge primitive rather than in domain.
 */
export function CutLogStatusBadge({ status, className }: CutLogStatusBadgeProps) {
  return (
    <StatusBadge tone={TONE_BY_STATUS[status]} className={className}>
      {formatCutLogStatus(status)}
    </StatusBadge>
  )
}
