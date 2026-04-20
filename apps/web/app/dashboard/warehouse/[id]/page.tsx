import { notFound } from "next/navigation"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { getWarehouseDetailPageData } from "@/modules/warehouse/data/queries"
import { WarehouseDetailClient } from "@/modules/warehouse/components/record/warehouse-detail-client"

export default async function WarehouseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const result = await getWarehouseDetailPageData(id)

  if (!result.ok) {
    if ("notFound" in result && result.notFound) {
      notFound()
    }

    if ("error" in result) {
      return (
        <DashboardErrorState
          title={result.error.title}
          message={result.error.message}
          detail={result.error.detail}
          errorCode={result.error.code}
        />
      )
    }

    notFound()
  }

  return (
    <WarehouseDetailClient
      warehouse={result.data}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/warehouse")}
    />
  )
}
