"use client"

import { ListRowCount } from "@/engines/list-view"

export type EntityTypesRowCountProps = {
  count: number
  total: number
}

export function EntityTypesRowCount({ count, total }: EntityTypesRowCountProps) {
  return <ListRowCount count={count} total={total} label="entity types" />
}
