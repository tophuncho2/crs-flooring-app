import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireManufacturersAccess } from "@/features/flooring/shared/access/lookup-domains"
import { resolveReturnTo } from "@/features/flooring/shared/record-page/detail-routes"
import { ManufacturerDetailClient } from "@/features/flooring/manufacturers/components/detail/manufacturer-detail-client"
import { getManufacturerDetailPageData } from "@/features/flooring/manufacturers/data/queries"

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
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/manufacturers")}
    />
  )
}
