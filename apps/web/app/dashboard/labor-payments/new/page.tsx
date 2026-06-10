import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { LaborPaymentCreateClient } from "@/modules/labor-payments/components/record/labor-payment-create-client"

export default async function LaborPaymentCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <LaborPaymentCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/labor-payments")}
    />
  )
}
