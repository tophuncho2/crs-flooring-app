import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { ELEVATED_MODULE_MIN_RANK } from "@builders/domain"
import { requireRankAtLeast } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getInventoryAgeIndicatorDetailPageData } from "@/modules/inventory-age-indicators/data/queries"
import { InventoryAgeIndicatorDetailClient } from "@/modules/inventory-age-indicators/components/record/inventory-age-indicator-detail-client"

export default async function InventoryAgeIndicatorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireRankAtLeast(ELEVATED_MODULE_MIN_RANK)

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getInventoryAgeIndicatorDetailPageData(id)

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
    <InventoryAgeIndicatorDetailClient
      initialInventoryAgeIndicator={result.data.inventoryAgeIndicator}
      previousInventoryAgeIndicatorId={result.data.previousInventoryAgeIndicatorId}
      nextInventoryAgeIndicatorId={result.data.nextInventoryAgeIndicatorId}
      backHref={resolveReturnTo(
        resolvedSearchParams?.returnTo,
        "/dashboard/inventory-age-indicators",
      )}
    />
  )
}
