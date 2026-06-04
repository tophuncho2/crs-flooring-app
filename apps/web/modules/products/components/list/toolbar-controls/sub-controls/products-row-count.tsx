"use client"

import { ListRowCount } from "@/engines/list-view"

export type ProductsRowCountProps = {
  count: number
  total: number
}

export function ProductsRowCount({ count, total }: ProductsRowCountProps) {
  return <ListRowCount count={count} total={total} label="products" />
}
