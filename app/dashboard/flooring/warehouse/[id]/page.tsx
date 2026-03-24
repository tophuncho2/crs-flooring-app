import { notFound } from "next/navigation"
import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/flooring/shared/controllers/record-page/detail-routes"
import { getWarehouseDetailPageData } from "@/features/flooring/warehouse/queries"
import { WarehouseDetailClient } from "@/features/flooring/warehouse/components/warehouse-detail-client"

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
      warehouse={result.data.warehouse}
      sections={result.data.sections}
      locations={result.data.locations}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/warehouse")}
    />
  )
}
