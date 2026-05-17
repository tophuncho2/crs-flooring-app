"use client"

import { ListRowCount } from "@/components/features/list-toolbar"

export type ManagementCompaniesRowCountProps = {
  count: number
  total: number
}

export function ManagementCompaniesRowCount({
  count,
  total,
}: ManagementCompaniesRowCountProps) {
  return <ListRowCount count={count} total={total} label="companies" />
}
