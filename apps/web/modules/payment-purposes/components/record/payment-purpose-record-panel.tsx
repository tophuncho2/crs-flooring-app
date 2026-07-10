"use client"

import { useRouter } from "next/navigation"
import {
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  RecordStepperPortal,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { PaymentPurpose } from "@builders/domain"
import { usePaymentPurposePrimarySection } from "@/modules/payment-purposes/controllers/record/primary/use-payment-purpose-primary-section"
import { PaymentPurposePrimaryFieldsSection } from "./primary/payment-purpose-primary-fields-section"

export function PaymentPurposeRecordPanel({
  page,
  entry,
  previousPaymentPurposeId,
  nextPaymentPurposeId,
}: {
  page: RecordDetailClientScaffoldContext
  entry: PaymentPurpose
  previousPaymentPurposeId: string | null
  nextPaymentPurposeId: string | null
}) {
  const router = useRouter()
  const controller = usePaymentPurposePrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 10,
      dirtyLabel: "payment purpose",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Payment Purpose"
          showHeader={false}
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
        >
          <PaymentPurposePrimaryFieldsSection
            draft={primary.localValue}
            editable={!primary.isSaving}
            onNameChange={(value) =>
              primary.setLocalValue((previous) => ({ ...previous, name: value }))
            }
            onColorChange={(value) =>
              primary.setLocalValue((previous) => ({ ...previous, color: value }))
            }
            paymentPurposeNumber={record.paymentPurposeNumber}
            createdAt={record.createdAt}
            updatedAt={record.updatedAt}
            createdBy={record.createdBy}
            updatedBy={record.updatedBy}
          />
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  return (
    <>
      {/* Walks the global ROW-number line (◀ ROW-n ▶) from the top bar. Payment-purpose
          detail is a per-id page, so a step router-navigates to the neighbor's
          page; the portal's dirty guard prompts first when edited. */}
      <RecordStepperPortal
        label={entry.paymentPurposeNumber}
        isDirty={page.isDirty}
        discardMessage="This payment purpose has unsaved changes. Stepping to another payment purpose will discard them."
        onPrevious={
          previousPaymentPurposeId
            ? () => router.push(`/dashboard/payment-purposes/${previousPaymentPurposeId}`)
            : null
        }
        onNext={
          nextPaymentPurposeId
            ? () => router.push(`/dashboard/payment-purposes/${nextPaymentPurposeId}`)
            : null
        }
      />
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
        deleteLabel="Delete Payment Purpose"
        confirmTitle="Delete payment purpose?"
        confirmMessage="This cannot be undone."
      />
    </>
  )
}
