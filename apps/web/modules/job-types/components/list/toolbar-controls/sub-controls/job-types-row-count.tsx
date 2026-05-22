"use client"

import { ListRowCount } from "@/components/features/list-toolbar"

export type JobTypesRowCountProps = {
  count: number
  total: number
}

export function JobTypesRowCount({ count, total }: JobTypesRowCountProps) {
  return <ListRowCount count={count} total={total} label="job types" />
}
