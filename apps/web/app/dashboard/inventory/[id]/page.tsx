import { notFound } from "next/navigation"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { InventoryDetailClient } from "@/modules/inventory/components/record/inventory-detail-client"
import { getInventoryDetailPageData } from "@/modules/inventory/data/queries"

export default async function InventoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getInventoryDetailPageData(id)

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
    <InventoryDetailClient
      initialRecord={result.data.inventory}
      locationOptions={result.data.locationOptions}
      warehouseOptions={result.data.warehouseOptions}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/inventory")}
    />
  )
}
