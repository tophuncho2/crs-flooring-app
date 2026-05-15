"use client"

import { ListRowCount } from "@/components/features/list-toolbar"

export type ProductsRowCountProps = {
  count: number
  total: number
}

export function ProductsRowCount({ count, total }: ProductsRowCountProps) {
  return <ListRowCount count={count} total={total} label="products" />
}
