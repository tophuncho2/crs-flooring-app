import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { requireRankAtLeast } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { WorkOrderDocumentTypeCreateClient } from "@/modules/work-order-document-types/components/record/work-order-document-type-create-client"

export default async function WorkOrderDocumentTypeCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <WorkOrderDocumentTypeCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/work-order-document-types")}
    />
  )
}
