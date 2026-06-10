"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { LaborPayment } from "@builders/domain"
import { LaborPaymentRecordPanel } from "./labor-payment-record-panel"

export function LaborPaymentDetailClient({
  initialLaborPayment,
  backHref,
}: {
  initialLaborPayment: LaborPayment
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Labor Payment Hub"
      backHref={backHref}
      headerVariant="section"
      modeNotice={{ mode: "edit", label: "Labor Payment" }}
      dirtyMessage="You have unsaved labor payment changes. Leave this page without saving?"
    >
      {(page) => <LaborPaymentRecordPanel page={page} entry={initialLaborPayment} />}
    </RecordDetailClientScaffold>
  )
}
