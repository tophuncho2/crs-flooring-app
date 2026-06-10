"use client"

import { buildRecordDetailHref } from "@/hooks/navigation"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { EMPTY_LABOR_PAYMENT_FORM, type LaborPaymentForm } from "@builders/domain"
import { createLaborPaymentRequest } from "@/modules/labor-payments/data/mutations"
import { LaborPaymentPrimaryFieldsSection } from "./primary/labor-payment-primary-fields-section"

function LaborPaymentCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<LaborPaymentForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_LABOR_PAYMENT_FORM }),
    createRecord: async (localValue) => {
      const { laborPayment } = await createLaborPaymentRequest(localValue)
      return {
        redirectTo: buildRecordDetailHref("/dashboard/labor-payments", laborPayment.id, backHref),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Labor Payment Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create Labor Payment"
      savingLabel="Creating Labor Payment..."
    >
      <LaborPaymentPrimaryFieldsSection
        draft={controller.primarySection.localValue}
        editable={!controller.primarySection.isSaving}
        onFieldChange={(field, value) =>
          controller.primarySection.setLocalValue((previous) => ({
            ...previous,
            [field]: value,
          }))
        }
      />
    </RecordSingleSectionPanel>
  )
}

export function LaborPaymentCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Labor Payment"
      backHref={backHref}
      modeNoticeLabel="Labor Payment"
      dirtyMessage="You have unsaved labor payment changes. Leave this form without saving?"
    >
      {(page) => <LaborPaymentCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
