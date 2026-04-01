"use client"

import {
  buildSingleSectionDeleteConfirmationMessage,
  RecordSingleSectionPanel,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { useCategoryPrimarySection } from "./controllers/use-category-primary-section"
import { CategoryPrimaryFieldsSection } from "./sections/category-primary-fields-section"
import type { CategoryRow, UnitOfMeasureOption } from "../../domain/types"

export function CategoryRecordPanel({
  page,
  category,
  unitOfMeasureOptions,
  canManage,
}: {
  page: RecordDetailClientScaffoldContext
  category: CategoryRow
  unitOfMeasureOptions: UnitOfMeasureOption[]
  canManage: boolean
}) {
  const controller = useCategoryPrimarySection({
    page,
    category,
  })

  return (
    <RecordSingleSectionPanel
      title="Category Details"
      controller={controller}
      canManage={canManage}
      showHeader={false}
      deleteConfirmationMessage={buildSingleSectionDeleteConfirmationMessage({
        entityLabel: "category",
        description: "If this category is linked to products, deletion will be blocked.",
      })}
    >
      <CategoryPrimaryFieldsSection
        category={controller.record}
        draft={controller.primarySection.localValue}
        unitOfMeasureOptions={unitOfMeasureOptions}
        disabled={!canManage || controller.primarySection.isSaving}
        onFieldChange={(field, value) => {
          controller.primarySection.setLocalValue((previous) => ({
            ...previous,
            [field]: value,
          }))
        }}
      />
    </RecordSingleSectionPanel>
  )
}
