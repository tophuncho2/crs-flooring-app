"use client"

import {
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { Payment } from "@builders/domain"
import { usePaymentPrimarySection } from "@/modules/payments/controllers/record/primary/use-payment-primary-section"
import { PaymentPrimaryFieldsSection } from "./primary/payment-primary-fields-section"

export function PaymentRecordPanel({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: Payment
}) {
  const controller = usePaymentPrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 10,
      dirtyLabel: "payment",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Payment"
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
          <PaymentPrimaryFieldsSection
            paymentNumber={record.paymentNumber}
            draft={primary.localValue}
            editable={!primary.isSaving}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
            createdAt={record.createdAt}
            updatedAt={record.updatedAt}
          />
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  return (
    <>
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
        deleteLabel="Delete Payment"
        confirmTitle="Delete payment?"
        confirmMessage="This cannot be undone."
      />
    </>
  )
}
