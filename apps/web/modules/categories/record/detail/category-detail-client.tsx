"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { CategoryRecordPanel } from "../panel/category-record-panel"
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
    <RecordDetailClientScaffold
      title={`Category ${category.name}`}
      backHref={backHref}
      dirtyMessage="You have unsaved category changes. Leave this category without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <CategoryRecordPanel
          page={page}
          category={category}
          unitOfMeasureOptions={unitOfMeasureOptions}
          canManage={canManage}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
