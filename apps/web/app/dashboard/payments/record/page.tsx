import { RESTRICTED_MODULE_MIN_RANK, type PaymentDetail } from "@builders/domain"
import { getPaymentDetailUseCase } from "@builders/application"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireRankAtLeast } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { PaymentCreateClient } from "@/modules/payments/components/record/payment-create-client"
import { PaymentDetailClient } from "@/modules/payments/components/record/payment-detail-client"

/**
 * The payment record view. The selected row rides in the query string
 * (`?paymentId=…`); with no id the create face opens. Payments stand alone —
 * there is no parent record to route into.
 */
export default async function FlooringPaymentRecordPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(RESTRICTED_MODULE_MIN_RANK)
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const rawId = resolvedSearchParams?.paymentId
  const paymentId = Array.isArray(rawId) ? rawId[0] : rawId
  const backHref = resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/payments")

  if (!paymentId) {
    return <PaymentCreateClient backHref={backHref} />
  }

  let initialPayment: PaymentDetail
  try {
    initialPayment = await getPaymentDetailUseCase(paymentId)
  } catch (error) {
    return (
      <DashboardErrorState
        title="Payment Unavailable"
        message="The app could not load this payment."
        detail={error instanceof Error ? error.message : "Unknown error"}
        errorCode="PAYMENT_RECORD_LOAD_FAILED"
      />
    )
  }

  return <PaymentDetailClient initialPayment={initialPayment} backHref={backHref} />
}
