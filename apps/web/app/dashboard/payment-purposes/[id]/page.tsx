import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { requireRankAtLeast } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getPaymentPurposeDetailPageData } from "@/modules/payment-purposes/data/queries"
import { PaymentPurposeDetailClient } from "@/modules/payment-purposes/components/record/payment-purpose-detail-client"

export default async function PaymentPurposeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getPaymentPurposeDetailPageData(id)

  if (!result.ok) {
    if ("notFound" in result && result.notFound) {
      notFound()
    }
    if (!("error" in result)) {
      notFound()
    }
    return (
      <DashboardErrorState
        title={result.error.title}
        message={result.error.message}
        detail={result.error.detail}
        errorCode={result.error.code}
      />
    )
  }

  return (
    <PaymentPurposeDetailClient
      initialPaymentPurpose={result.data.paymentPurpose}
      previousPaymentPurposeId={result.data.previousPaymentPurposeId}
      nextPaymentPurposeId={result.data.nextPaymentPurposeId}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/payment-purposes")}
    />
  )
}
