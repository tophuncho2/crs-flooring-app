import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { getTemplateDetailPageData } from "@/modules/templates/data/queries"
import { TemplateDetailClient } from "@/modules/templates/components/record/template-detail-client"

export default async function TemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("templates")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getTemplateDetailPageData(id)

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
    <TemplateDetailClient
      template={result.data.template}
      jobTypeOptions={result.data.jobTypeOptions}
      warehouseOptions={result.data.warehouseOptions}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/templates")}
    />
  )
}
