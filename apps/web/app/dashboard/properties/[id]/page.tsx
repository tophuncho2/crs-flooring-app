import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { getPropertyDetailPageData } from "@/modules/properties/data/queries"
import { PropertyDetailClient } from "@/modules/properties/record/detail/property-detail-client"

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getPropertyDetailPageData(id)

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
    <PropertyDetailClient
      property={result.data.property}
      managementOptions={result.data.managementOptions}
      warehouseOptions={result.data.warehouseOptions}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/properties")}
    />
  )
}
