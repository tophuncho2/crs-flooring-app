import type { Payment } from "@builders/domain"
import { getPaymentUseCase } from "@builders/application"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireSessionUser } from "@/server/auth/session"
import PaymentRecordClient from "@/modules/payments/components/record/payment-record-client"

export default async function FlooringPaymentRecordPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const rawId = resolvedSearchParams?.paymentId
  const paymentId = Array.isArray(rawId) ? rawId[0] : rawId

  let initialPayment: Payment | null = null
  if (paymentId) {
    try {
      initialPayment = await getPaymentUseCase(paymentId)
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
  }

  return <PaymentRecordClient initialPayment={initialPayment} />
}
