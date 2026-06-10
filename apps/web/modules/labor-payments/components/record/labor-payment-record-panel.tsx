"use client"

import {
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { LaborPayment } from "@builders/domain"
import { useLaborPaymentPrimarySection } from "@/modules/labor-payments/controllers/record/primary/use-labor-payment-primary-section"
import { LaborPaymentPrimaryFieldsSection } from "./primary/labor-payment-primary-fields-section"

export function LaborPaymentRecordPanel({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: LaborPayment
}) {
  const controller = useLaborPaymentPrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 10,
      dirtyLabel: "labor payment",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Labor Payment"
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
          <LaborPaymentPrimaryFieldsSection
            draft={primary.localValue}
            editable={!primary.isSaving}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
            contactName={record.contactName}
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
        deleteLabel="Delete Labor Payment"
        confirmTitle="Delete labor payment?"
        confirmMessage="This cannot be undone."
      />
    </>
  )
}
