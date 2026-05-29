"use client"

import { formatAdjustmentStatus, type FlooringInventoryAdjustmentStatus } from "@builders/domain"
import type { BadgeTone } from "./contracts/badge-tone"
import { StatusBadge } from "./status-badge"

const TONE_BY_STATUS: Record<FlooringInventoryAdjustmentStatus, BadgeTone> = {
  PENDING: "warning",
  QUEUED: "processing",
  FINAL: "success",
}

export type AdjustmentStatusBadgeProps = {
  status: FlooringInventoryAdjustmentStatus
  className?: string
}

/**
 * Adjustment status pill. Single source for the status → tone mapping that was
 * previously duplicated in the work-orders adjustment row and the inventory
 * adjustment section. Composes the generic `StatusBadge` with the adjustment
 * vocabulary; the human label comes from `formatAdjustmentStatus` in the domain.
 *
 * The status → tone mapping is itself a UI presentation choice (not a domain
 * rule), so it lives here next to the badge primitive rather than in domain.
 */
export function AdjustmentStatusBadge({ status, className }: AdjustmentStatusBadgeProps) {
  return (
    <StatusBadge tone={TONE_BY_STATUS[status]} className={className}>
      {formatAdjustmentStatus(status)}
    </StatusBadge>
  )
}
