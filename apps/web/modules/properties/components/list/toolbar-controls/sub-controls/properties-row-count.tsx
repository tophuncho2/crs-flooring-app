"use client"

import { ListRowCount } from "@/components/features/list-toolbar"

export type PropertiesRowCountProps = {
  count: number
  total: number
}

export function PropertiesRowCount({ count, total }: PropertiesRowCountProps) {
  return <ListRowCount count={count} total={total} label="rows" />
}
