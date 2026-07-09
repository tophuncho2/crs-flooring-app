import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { requireRankAtLeast } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getWarehouseDetailPageData } from "@/modules/warehouse/data/queries"
import { WarehouseDetailClient } from "@/modules/warehouse/components/record/warehouse-detail-client"

export default async function WarehouseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getWarehouseDetailPageData(id)

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
    <WarehouseDetailClient
      initialWarehouse={result.data.warehouse}
      stats={result.data.stats}
      previousWarehouseId={result.data.previousWarehouseId}
      nextWarehouseId={result.data.nextWarehouseId}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/warehouse")}
    />
  )
}
