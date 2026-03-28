"use client"

import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { RecordSummaryCard } from "@/features/flooring/shared/display/record-summary-card"
import { RecordSummaryGrid } from "@/features/flooring/shared/display/record-summary-grid"
import { RecordPanelFooter } from "@/features/dashboard/shared/record-view/shell/record-panel-footer"
import { RecordFormField } from "@/features/flooring/shared/forms/record-form"
import { RecordDetailPageShell } from "@/features/dashboard/shared/record-view/shell/record-detail-page-shell"
import { formatStableDateTime } from "@/features/flooring/shared/utils/date-format"
import type { ManufacturerRow } from "../../domain/types"
import { useManufacturerRecordController } from "../../controllers/use-manufacturer-record-controller"

export function ManufacturerRecordPanel({
  manufacturer,
  backHref,
}: {
  manufacturer: ManufacturerRow
  backHref: string
}) {
  const controller = useManufacturerRecordController({
    initialManufacturer: manufacturer,
    backHref,
  })

  return (
    <RecordDetailPageShell title={`Manufacturer ${controller.manufacturer.companyName || controller.manufacturer.agentName}`} backHref={backHref} onBack={controller.closePage}>
      <div className="space-y-6">
        <FormStatusNotices message={controller.notices.message} error={controller.notices.error} loadingMessage={controller.isSaving ? "Saving manufacturer..." : ""} />
        <RecordSummaryGrid>
          <RecordSummaryCard label="Products">{controller.manufacturer.productsCount}</RecordSummaryCard>
          <RecordSummaryCard label="Updated">{formatStableDateTime(controller.manufacturer.updatedAt)}</RecordSummaryCard>
        </RecordSummaryGrid>
        <div className="grid gap-4 md:grid-cols-2">
          <RecordFormField label="Company Name">
            <input value={controller.draft.companyName} onChange={(event) => controller.updateDraft("companyName", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Agent Name">
            <input value={controller.draft.agentName} onChange={(event) => controller.updateDraft("agentName", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Website">
            <input value={controller.draft.website} onChange={(event) => controller.updateDraft("website", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Phone">
            <input value={controller.draft.phone} onChange={(event) => controller.updateDraft("phone", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Email">
            <input value={controller.draft.email} onChange={(event) => controller.updateDraft("email", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
        </div>
        <RecordPanelFooter
          onClose={controller.closePage}
          closeLabel="Back"
          onSave={() => void controller.save()}
          saveLabel="Save Manufacturer"
          savingLabel="Saving Manufacturer..."
          onDelete={() => void controller.remove()}
          deleteLabel="Delete Manufacturer"
          deleteConfirmMessage="Delete this manufacturer? This cannot be undone."
          isSaving={controller.isSaving}
        />
      </div>
    </RecordDetailPageShell>
  )
}
