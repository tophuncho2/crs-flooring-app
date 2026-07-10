"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { PaymentPurpose } from "@builders/domain"
import { PaymentPurposeRecordPanel } from "./payment-purpose-record-panel"

export function PaymentPurposeDetailClient({
  initialPaymentPurpose,
  backHref,
  previousPaymentPurposeId,
  nextPaymentPurposeId,
}: {
  initialPaymentPurpose: PaymentPurpose
  backHref: string
  previousPaymentPurposeId: string | null
  nextPaymentPurposeId: string | null
}) {
  return (
    <RecordDetailClientScaffold
      title="Payment Purposes Hub"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="You have unsaved payment purpose changes. Leave this page without saving?"
    >
      {(page) => (
        <PaymentPurposeRecordPanel
          page={page}
          entry={initialPaymentPurpose}
          previousPaymentPurposeId={previousPaymentPurposeId}
          nextPaymentPurposeId={nextPaymentPurposeId}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
