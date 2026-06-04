"use client"

import { ListRowCount } from "@/engines/list-view"

export type PropertiesRowCountProps = {
  count: number
  total: number
}

export function PropertiesRowCount({ count, total }: PropertiesRowCountProps) {
  return <ListRowCount count={count} total={total} label="rows" />
}
