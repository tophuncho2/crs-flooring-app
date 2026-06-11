import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getManufacturerDetailPageData } from "@/modules/manufacturers/data/queries"
import { ManufacturerDetailClient } from "@/modules/manufacturers/components/record/manufacturer-detail-client"

export default async function ManufacturerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

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
      initialManufacturer={result.data.manufacturer}
      stats={result.data.stats}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/manufacturers")}
    />
  )
}
