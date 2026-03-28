"use client"

import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { RecordSummaryCard } from "@/features/flooring/shared/display/record-summary-card"
import { RecordSummaryGrid } from "@/features/flooring/shared/display/record-summary-grid"
import { RecordPanelFooter } from "@/features/dashboard/shared/record-view/shell/record-panel-footer"
import { RecordFormField } from "@/features/flooring/shared/forms/record-form"
import { RecordDetailPageShell } from "@/features/dashboard/shared/record-view/shell/record-detail-page-shell"
import { formatStableDateTime } from "@/features/flooring/shared/utils/date-format"
import type { ServiceRow, UnitOption } from "../../domain/types"
import { useServiceRecordController } from "../../controllers/use-service-record-controller"

export function ServiceRecordPanel({
  service,
  unitOptions,
  backHref,
}: {
  service: ServiceRow
  unitOptions: UnitOption[]
  backHref: string
}) {
  const controller = useServiceRecordController({
    initialService: service,
    backHref,
  })

  return (
    <RecordDetailPageShell title={`Service ${controller.service.name}`} backHref={backHref} onBack={controller.closePage}>
      <div className="space-y-6">
        <FormStatusNotices message={controller.notices.message} error={controller.notices.error} loadingMessage={controller.isSaving ? "Saving service..." : ""} />
        <RecordSummaryGrid>
          <RecordSummaryCard label="Usage">{controller.service.usageCount}</RecordSummaryCard>
          <RecordSummaryCard label="Updated">{formatStableDateTime(controller.service.updatedAt)}</RecordSummaryCard>
        </RecordSummaryGrid>
        <div className="grid gap-4 md:grid-cols-2">
          <RecordFormField label="Service Name">
            <input value={controller.draft.name} onChange={(event) => controller.updateDraft("name", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Service Unit">
            <select value={controller.draft.unitId} onChange={(event) => controller.updateDraft("unitId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
              <option value="">Select unit</option>
              {unitOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </RecordFormField>
          <RecordFormField label="Cost">
            <input value={controller.draft.baseCost} onChange={(event) => controller.updateDraft("baseCost", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Notes">
            <textarea value={controller.draft.notes} onChange={(event) => controller.updateDraft("notes", event.target.value)} className="min-h-[120px] rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
        </div>
        <RecordPanelFooter
          onClose={controller.closePage}
          closeLabel="Back"
          onSave={() => void controller.save()}
          saveLabel="Save Service"
          savingLabel="Saving Service..."
          onDelete={() => void controller.remove()}
          deleteLabel="Delete Service"
          deleteConfirmMessage="Delete this service? This cannot be undone."
          isSaving={controller.isSaving}
        />
      </div>
    </RecordDetailPageShell>
  )
}
