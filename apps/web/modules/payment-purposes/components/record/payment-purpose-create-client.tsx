"use client"

import { buildRecordDetailHref } from "@/hooks/navigation"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { EMPTY_PAYMENT_PURPOSE_FORM, type PaymentPurposeForm } from "@builders/domain"
import { createPaymentPurposeRequest } from "@/modules/payment-purposes/data/mutations"
import { PaymentPurposePrimaryFieldsSection } from "./primary/payment-purpose-primary-fields-section"

function PaymentPurposeCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<PaymentPurposeForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_PAYMENT_PURPOSE_FORM }),
    createRecord: async (localValue) => {
      const { paymentPurpose } = await createPaymentPurposeRequest(localValue)
      return {
        redirectTo: buildRecordDetailHref(
          "/dashboard/payment-purposes",
          paymentPurpose.id,
          backHref,
        ),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Payment Purpose Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create"
      savingLabel="Creating..."
    >
      <PaymentPurposePrimaryFieldsSection
        draft={controller.primarySection.localValue}
        editable={!controller.primarySection.isSaving}
        onNameChange={(value) =>
          controller.primarySection.setLocalValue((previous) => ({ ...previous, name: value }))
        }
        onColorChange={(value) =>
          controller.primarySection.setLocalValue((previous) => ({ ...previous, color: value }))
        }
      />
    </RecordSingleSectionPanel>
  )
}

export function PaymentPurposeCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Payment Purpose"
      backHref={backHref}
      dirtyMessage="You have unsaved payment purpose changes. Leave this form without saving?"
    >
      {(page) => <PaymentPurposeCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
