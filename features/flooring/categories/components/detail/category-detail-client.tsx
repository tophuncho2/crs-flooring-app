"use client"

import { CategoryRecordPanel } from "./category-record-panel"
import type { CategoryRow, UnitOfMeasureOption } from "../../domain/types"

export function CategoryDetailClient({
  category,
  unitOfMeasureOptions,
  canManage,
  backHref,
}: {
  category: CategoryRow
  unitOfMeasureOptions: UnitOfMeasureOption[]
  canManage: boolean
  backHref: string
}) {
  return (
    <CategoryRecordPanel category={category} unitOfMeasureOptions={unitOfMeasureOptions} canManage={canManage} backHref={backHref} />
  )
}
