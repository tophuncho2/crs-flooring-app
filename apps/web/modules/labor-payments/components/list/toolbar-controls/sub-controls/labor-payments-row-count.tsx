"use client"

import { ListRowCount } from "@/engines/list-view"

export type LaborPaymentsRowCountProps = {
  count: number
  total: number
}

export function LaborPaymentsRowCount({ count, total }: LaborPaymentsRowCountProps) {
  return <ListRowCount count={count} total={total} label="labor payments" />
}
