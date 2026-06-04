"use client"

import { ListRowCount } from "@/engines/list-view"

export type TemplatesRowCountProps = {
  count: number
  total: number
}

export function TemplatesRowCount({ count, total }: TemplatesRowCountProps) {
  return <ListRowCount count={count} total={total} label="rows" />
}
