import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireManufacturersAccess } from "@/modules/shared/access/lookup-domains"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { ManufacturerDetailClient } from "@/modules/manufacturers/record/detail/manufacturer-detail-client"
import { getManufacturerDetailPageData } from "@/modules/manufacturers/data/queries"

export default async function ManufacturerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireManufacturersAccess()
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getManufacturerDetailPageData(id)

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
    <ManufacturerDetailClient
      manufacturer={result.data}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/manufacturers")}
    />
  )
}
