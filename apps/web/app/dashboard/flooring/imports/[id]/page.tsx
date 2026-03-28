import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { getImportDetailPageData } from "@/features/flooring/imports/data/queries"
import { ImportDetailClient } from "@/features/flooring/imports/components/detail/import-detail-client"

export default async function ImportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getImportDetailPageData(id)

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
    <ImportDetailClient
      initialImport={result.data.entry}
      productOptions={result.data.productOptions}
      warehouseOptions={result.data.warehouseOptions}
      locationOptions={result.data.locationOptions}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/imports")}
    />
  )
}
