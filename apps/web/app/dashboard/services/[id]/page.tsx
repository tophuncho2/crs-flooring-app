import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireServicesAccess } from "@/modules/shared/access/lookup-domains"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { ServiceDetailClient } from "@/modules/services/components/record/service-detail-client"
import { getServiceDetailPageData } from "@/modules/services/data/queries"
import { loadUnitOptions } from "@/modules/services/data/load-unit-options"

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireServicesAccess()
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const [result, unitOptions] = await Promise.all([
    getServiceDetailPageData(id),
    loadUnitOptions(),
  ])

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
    <ServiceDetailClient
      service={result.data}
      unitOptions={unitOptions}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/services")}
    />
  )
}
