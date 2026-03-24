import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"
import { resolveReturnTo } from "@/features/flooring/shared/controllers/record-page/detail-routes"
import { getManagementCompanyDetailPageData } from "@/features/flooring/management-companies/data/queries"
import { ManagementCompanyDetailClient } from "@/features/flooring/management-companies/components/detail/management-company-detail-client"

export default async function ManagementCompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireToolAccess("warehouse")

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getManagementCompanyDetailPageData(id)

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
    <ManagementCompanyDetailClient
      company={result.data.company}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/management-companies")}
    />
  )
}
