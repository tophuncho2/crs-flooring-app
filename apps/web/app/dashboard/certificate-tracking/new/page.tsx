import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { requireRankAtLeast } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { CertificateCreateClient } from "@/modules/certificates/components/record/certificate-create-client"

export default async function CertificateCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <CertificateCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/certificate-tracking")}
    />
  )
}
