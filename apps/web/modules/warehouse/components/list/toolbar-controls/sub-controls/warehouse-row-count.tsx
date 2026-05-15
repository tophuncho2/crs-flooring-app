"use client"

import { ListRowCount } from "@/components/features/list-toolbar"

export type WarehouseRowCountProps = {
  count: number
  total: number
}

export function WarehouseRowCount({ count, total }: WarehouseRowCountProps) {
  return <ListRowCount count={count} total={total} label="warehouses" />
}
