import { notFound } from "next/navigation"
import DashboardErrorState from "@/features/app-shell/components/dashboard-error-state"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { InventoryDetailClient } from "@/features/flooring/inventory/record/detail/inventory-detail-client"
import { getInventoryDetailPageData } from "@/features/flooring/inventory/queries"

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
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/inventory")}
    />
  )
}
