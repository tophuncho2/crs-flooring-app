"use client"

import { ListRowCount } from "@/engines/list-view"

export type InventoryRowCountProps = {
  count: number
  total: number
}

/**
 * Inventory list-view row count. Wraps the shared `ListRowCount` with
 * the inventory-specific label baked in so the toolbar reads
 * `X of Y rows`.
 */
export function InventoryRowCount({ count, total }: InventoryRowCountProps) {
  return <ListRowCount count={count} total={total} label="rows" />
}
