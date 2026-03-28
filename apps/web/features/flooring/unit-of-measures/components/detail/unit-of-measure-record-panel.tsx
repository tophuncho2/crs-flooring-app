"use client"

import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { RecordSummaryCard } from "@/features/flooring/shared/display/record-summary-card"
import { RecordSummaryGrid } from "@/features/flooring/shared/display/record-summary-grid"
import { RecordDetailPageShell } from "@/features/dashboard/shared/record-view/shell/record-detail-page-shell"
import { RecordPanelFooter } from "@/features/dashboard/shared/record-view/shell/record-panel-footer"
import { RecordFormField } from "@/features/flooring/shared/forms/record-form"
import { formatStableDateTime } from "@/features/flooring/shared/utils/date-format"
import type { UnitOfMeasureRow } from "../../domain/types"
import { useUnitOfMeasuresRecordController } from "../../controllers/use-unit-of-measures-record-controller"

export function UnitOfMeasureRecordPanel({
  unitOfMeasure,
  canManage,
  backHref,
}: {
  unitOfMeasure: UnitOfMeasureRow
  canManage: boolean
  backHref: string
}) {
  const controller = useUnitOfMeasuresRecordController({
    initialUnitOfMeasure: unitOfMeasure,
    backHref,
  })

  return (
    <RecordDetailPageShell
      title={`Unit Of Measure ${controller.unitOfMeasure.name}`}
      backHref={backHref}
      onBack={controller.closePage}
    >
      <div className="space-y-6">
        <FormStatusNotices
          message={controller.notices.message}
          error={controller.notices.error}
          loadingMessage={controller.isSaving ? "Saving unit of measure..." : ""}
        />

        <RecordSummaryGrid>
          <RecordSummaryCard label="Created">
            {formatStableDateTime(controller.unitOfMeasure.createdAt)}
          </RecordSummaryCard>
        </RecordSummaryGrid>

        <RecordFormField label="Unit Of Measure">
          <input
            value={controller.draft.name}
            onChange={(event) => controller.updateName(event.target.value)}
            disabled={!canManage}
            className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 disabled:opacity-70"
          />
        </RecordFormField>

        {canManage ? (
          <RecordPanelFooter
            onClose={controller.closePage}
            closeLabel="Back"
            onSave={() => void controller.save()}
            saveLabel="Save Unit Of Measure"
            savingLabel="Saving Unit Of Measure..."
            onDelete={() => void controller.remove()}
            deleteLabel="Delete Unit Of Measure"
            deleteConfirmMessage="Delete this unit of measure? This cannot be undone."
            isSaving={controller.isSaving}
          />
        ) : null}
      </div>
    </RecordDetailPageShell>
  )
}
