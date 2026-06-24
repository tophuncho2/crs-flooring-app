"use client"

import { ListRowCount } from "@/engines/list-view"

export type EntitiesRowCountProps = {
  count: number
  total: number
}

export function EntitiesRowCount({
  count,
  total,
}: EntitiesRowCountProps) {
  return <ListRowCount count={count} total={total} label="entities" />
}
