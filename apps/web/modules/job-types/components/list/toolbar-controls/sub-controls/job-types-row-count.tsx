"use client"

import { ListRowCount } from "@/engines/list-view"

export type JobTypesRowCountProps = {
  count: number
  total: number
}

export function JobTypesRowCount({ count, total }: JobTypesRowCountProps) {
  return <ListRowCount count={count} total={total} label="job types" />
}
