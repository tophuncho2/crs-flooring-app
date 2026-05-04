import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { getImportDetailPageData } from "@/modules/imports/data/queries"
import { ImportDetailClient } from "@/modules/imports/components/record/import-detail-client"

export default async function ImportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getImportDetailPageData(id)

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
    <ImportDetailClient
      initialImport={result.data.entry}
      initialStagedRows={result.data.stagedRows}
      initialLiveRows={result.data.liveRows}
      warehouseOptions={result.data.warehouseOptions}
      manufacturerOptions={result.data.manufacturerOptions}
      locationOptions={result.data.locationOptions}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/imports")}
    />
  )
}
