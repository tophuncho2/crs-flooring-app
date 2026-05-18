"use client"

import { ListRowCount } from "@/components/features/list-toolbar"

export type ImportsRowCountProps = {
  count: number
  total: number
}

export function ImportsRowCount({ count, total }: ImportsRowCountProps) {
  return <ListRowCount count={count} total={total} label="imports" />
}
