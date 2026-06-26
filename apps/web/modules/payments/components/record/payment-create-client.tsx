"use client"

import { useRef } from "react"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  describePaymentFormIssues,
  EMPTY_PAYMENT_FORM,
  validatePaymentForm,
  type PaymentForm,
} from "@builders/domain"
import { createRecordSectionError } from "@/types/record/section-error"
import { createPaymentRequest } from "@/modules/payments/data/mutations"
import { PaymentPrimaryFieldsSection } from "./primary/payment-primary-fields-section"

const PAYMENTS_RECORD_PATH = "/dashboard/payments/record"

function PaymentCreatePanel({
  page,
}: {
  page: RecordDetailClientScaffoldContext
}) {
  // One stable idempotency key per create mount — replays on retry instead of
  // inserting a second row (the double-submit fix). The engine's in-flight guard
  // (`isSaving`) blocks concurrent submits; the redirect unmounts on success, so
  // a fresh key per mount is correct.
  const createKeyRef = useRef<string | null>(null)
  if (createKeyRef.current === null) createKeyRef.current = crypto.randomUUID()

  const controller = useSingleSectionCreateController<PaymentForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_PAYMENT_FORM }),
    createRecord: async (localValue) => {
      const issues = validatePaymentForm(localValue)
      if (issues.length > 0) {
        throw createRecordSectionError({
          kind: "validation",
          message: describePaymentFormIssues(issues),
          retryable: true,
        })
      }
      const { payment } = await createPaymentRequest(localValue, createKeyRef.current!)
      return {
        redirectTo: `${PAYMENTS_RECORD_PATH}?paymentId=${payment.id}`,
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Payment Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create"
      savingLabel="Creating..."
    >
      <PaymentPrimaryFieldsSection
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

export function PaymentCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Payment"
      backHref={backHref}
      dirtyMessage="You have unsaved payment changes. Leave this form without saving?"
    >
      {(page) => <PaymentCreatePanel page={page} />}
    </RecordCreateClientScaffold>
  )
}
