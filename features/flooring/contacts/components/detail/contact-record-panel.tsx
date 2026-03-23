"use client"

import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { RecordSummaryCard } from "@/features/flooring/shared/ui/display/record-summary-card"
import { RecordSummaryGrid } from "@/features/flooring/shared/ui/display/record-summary-grid"
import { RecordPanelFooter } from "@/features/flooring/shared/ui/forms/record-panel-footer"
import { RecordFormField } from "@/features/flooring/shared/ui/forms/record-form"
import { RecordDetailPageShell } from "@/features/flooring/shared/ui/record-page/record-detail-page-shell"
import { formatStableDateTime } from "@/features/flooring/shared/domain/date-format"
import { useContactRecordController } from "../../controllers/use-contact-record-controller"
import { CONTACT_TYPE_LABELS, CONTACT_TYPE_OPTIONS, type ContactDetail } from "../../domain/types"

export function ContactRecordPanel({
  contact,
  backHref,
}: {
  contact: ContactDetail
  backHref: string
}) {
  const controller = useContactRecordController({
    initialContact: contact,
    backHref,
  })

  return (
    <RecordDetailPageShell title={`Contact ${controller.contact.name}`} backHref={backHref} onBack={controller.closePage} sizeClass="max-w-5xl">
      <div className="space-y-6">
        <FormStatusNotices message={controller.notices.message} error={controller.notices.error} loadingMessage={controller.isSaving ? "Saving contact..." : ""} />
        <RecordSummaryGrid>
          <RecordSummaryCard label="Assignments">{controller.contact.assignmentsCount}</RecordSummaryCard>
          <RecordSummaryCard label="Created">{formatStableDateTime(controller.contact.createdAt)}</RecordSummaryCard>
          <RecordSummaryCard label="Updated">{formatStableDateTime(controller.contact.updatedAt)}</RecordSummaryCard>
        </RecordSummaryGrid>
        <div className="grid gap-4 md:grid-cols-2">
          <RecordFormField label="Contact Name">
            <input value={controller.draft.name} onChange={(event) => controller.updateDraft("name", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
          </RecordFormField>
          <RecordFormField label="Contact Type">
            <select value={controller.draft.type} onChange={(event) => controller.updateDraft("type", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
              <option value="">Select type</option>
              {CONTACT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{CONTACT_TYPE_LABELS[option]}</option>
              ))}
            </select>
          </RecordFormField>
        </div>
        <RecordPanelFooter
          onClose={controller.closePage}
          closeLabel="Back"
          onSave={() => void controller.save()}
          saveLabel="Save Contact"
          savingLabel="Saving Contact..."
          onDelete={() => void controller.remove()}
          deleteLabel="Delete Contact"
          deleteConfirmMessage="Delete this contact? This cannot be undone."
          isSaving={controller.isSaving}
        />
      </div>
    </RecordDetailPageShell>
  )
}
