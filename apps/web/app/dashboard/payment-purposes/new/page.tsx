import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { requireRankAtLeast } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { PaymentPurposeCreateClient } from "@/modules/payment-purposes/components/record/payment-purpose-create-client"

export default async function PaymentPurposeCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <PaymentPurposeCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/payment-purposes")}
    />
  )
}
