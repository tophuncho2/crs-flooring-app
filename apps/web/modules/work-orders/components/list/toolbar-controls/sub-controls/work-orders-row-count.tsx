"use client"

import { ListRowCount } from "@/engines/list-view"

export type WorkOrdersRowCountProps = {
  count: number
  total: number
}

/**
 * Work-order list-view row count. Wraps the shared `ListRowCount` with
 * the work-order-specific label baked in so the toolbar reads
 * `X of Y work orders`.
 */
export function WorkOrdersRowCount({ count, total }: WorkOrdersRowCountProps) {
  return <ListRowCount count={count} total={total} label="work orders" />
}
