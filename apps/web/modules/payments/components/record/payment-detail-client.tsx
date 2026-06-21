"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { Payment } from "@builders/domain"
import { PaymentRecordPanel } from "./payment-record-panel"

export function PaymentDetailClient({
  initialPayment,
  backHref,
}: {
  initialPayment: Payment
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={`Payment ${initialPayment.paymentNumber}`}
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="You have unsaved payment changes. Leave this page without saving?"
    >
      {(page) => <PaymentRecordPanel page={page} entry={initialPayment} />}
    </RecordDetailClientScaffold>
  )
}
