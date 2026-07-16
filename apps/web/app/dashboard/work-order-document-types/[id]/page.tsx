import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { requireRankAtLeast } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getWorkOrderDocumentTypeDetailPageData } from "@/modules/work-order-document-types/data/queries"
import { WorkOrderDocumentTypeDetailClient } from "@/modules/work-order-document-types/components/record/work-order-document-type-detail-client"

export default async function WorkOrderDocumentTypeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getWorkOrderDocumentTypeDetailPageData(id)

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
    <WorkOrderDocumentTypeDetailClient
      initialWorkOrderDocumentType={result.data.workOrderDocumentType}
      previousWorkOrderDocumentTypeId={result.data.previousWorkOrderDocumentTypeId}
      nextWorkOrderDocumentTypeId={result.data.nextWorkOrderDocumentTypeId}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/work-order-document-types")}
    />
  )
}
