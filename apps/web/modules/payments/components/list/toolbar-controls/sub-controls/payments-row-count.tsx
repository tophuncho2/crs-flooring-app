"use client"

import { ListRowCount } from "@/engines/list-view"

export type PaymentsRowCountProps = {
  count: number
  total: number
}

/**
 * Payments list-view row count. Wraps the shared `ListRowCount` with the
 * payments-specific label baked in so the toolbar reads `X of Y payments`.
 */
export function PaymentsRowCount({ count, total }: PaymentsRowCountProps) {
  return <ListRowCount count={count} total={total} label="payments" />
}
