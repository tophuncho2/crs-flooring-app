"use client"

import { ListRowCount } from "@/engines/list-view"

export type ManufacturersRowCountProps = {
  count: number
  total: number
}

export function ManufacturersRowCount({ count, total }: ManufacturersRowCountProps) {
  return <ListRowCount count={count} total={total} label="manufacturers" />
}
