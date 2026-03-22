"use client"

import { FormStatusNotices } from "@/features/flooring/shared/feedback/notices"
import { RecordSummaryCard } from "@/features/flooring/shared/display/record-summary-card"
import { RecordSummaryGrid } from "@/features/flooring/shared/display/record-summary-grid"
import { RecordPanelFooter } from "@/features/flooring/shared/forms/record-panel-footer"
import { RecordDetailPageShell } from "@/features/flooring/shared/record-page/record-detail-page-shell"
import { formatStableDateTime } from "@/features/flooring/shared/utils/date-format"
import { CategoryFormFields } from "../category-form-fields"
import type { CategoryRow, UnitOfMeasureOption } from "../../domain/types"
import { useCategoryRecordController } from "../../controllers/use-category-record-controller"

export function CategoryRecordPanel({
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
  const controller = useCategoryRecordController({
    initialCategory: category,
    backHref,
  })

  return (
    <RecordDetailPageShell title={`Category ${controller.category.name}`} backHref={backHref} onBack={controller.closePage} sizeClass="max-w-5xl">
      <div className="space-y-6">
        <FormStatusNotices message={controller.notices.message} error={controller.notices.error} loadingMessage={controller.isSaving ? "Saving category..." : ""} />
        <RecordSummaryGrid>
          <RecordSummaryCard label="Products">{controller.category.productCount}</RecordSummaryCard>
          <RecordSummaryCard label="Created">{formatStableDateTime(controller.category.createdAt)}</RecordSummaryCard>
        </RecordSummaryGrid>
        <CategoryFormFields draft={controller.draft} options={unitOfMeasureOptions} disabled={!canManage} onFieldChange={controller.updateDraft} />
        {canManage ? (
          <RecordPanelFooter
            onClose={controller.closePage}
            closeLabel="Back"
            onSave={() => void controller.save()}
            saveLabel="Save Category"
            savingLabel="Saving Category..."
            onDelete={() => void controller.remove()}
            deleteLabel="Delete Category"
            deleteConfirmMessage="Delete this category? This cannot be undone."
            isSaving={controller.isSaving}
          />
        ) : null}
      </div>
    </RecordDetailPageShell>
  )
}
