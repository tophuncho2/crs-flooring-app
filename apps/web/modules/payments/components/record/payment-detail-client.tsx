"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  RecordDetailClientScaffold,
  RecordStepperPortal,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { PaymentDetail, PaymentNeighbor } from "@builders/domain"
import { PaymentRecordPanel } from "./payment-record-panel"

export function PaymentDetailClient({
  initialPayment,
  backHref,
}: {
  initialPayment: PaymentDetail
  backHref: string
}) {
  const router = useRouter()
  const { previousPayment, nextPayment } = initialPayment

  // Payments are a plain SSR query-string route (?paymentId=…), not an in-place
  // selection like inventory — so a step is a route navigation to the neighbor.
  // Carry `backHref` through as `returnTo` so the neighbor's back button lands
  // wherever this record's did. The portal's dirty-guard prompts before the push.
  const stepTo = (neighbor: PaymentNeighbor) => {
    const query = new URLSearchParams({
      paymentId: neighbor.id,
      returnTo: backHref,
    }).toString()
    router.push(`/dashboard/payments/record?${query}`)
  }

  // Warm the neighbor routes so stepping lands on already-fetched data.
  useEffect(() => {
    if (previousPayment) {
      router.prefetch(`/dashboard/payments/record?paymentId=${previousPayment.id}`)
    }
    if (nextPayment) {
      router.prefetch(`/dashboard/payments/record?paymentId=${nextPayment.id}`)
    }
  }, [previousPayment, nextPayment, router])

  return (
    <RecordDetailClientScaffold
      title="Payments Hub"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="You have unsaved payment changes. Leave this page without saving?"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <>
          {/* Top-bar stepper — walks the global payment-number line (◀ PAY-# ▶).
              Mounted off the SSR snapshot; each step is a route nav to the neighbor. */}
          <RecordStepperPortal
            label={initialPayment.paymentNumber}
            isDirty={page.isDirty}
            discardMessage="This payment has unsaved changes. Stepping to another payment will discard them."
            onPrevious={previousPayment ? () => stepTo(previousPayment) : null}
            onNext={nextPayment ? () => stepTo(nextPayment) : null}
          />
          <PaymentRecordPanel page={page} entry={initialPayment} />
        </>
      )}
    </RecordDetailClientScaffold>
  )
}
