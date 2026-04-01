import DashboardErrorState from "@/app/dashboard/dashboard-error-state"
import { notFound } from "next/navigation"
import { canEditUnitOfMeasures } from "@/server/auth/access-control"
import { requireUnitOfMeasuresAccess } from "@/features/flooring/shared/access/lookup-domains"
import { resolveReturnTo } from "@/features/dashboard/shared/navigation/detail-routes"
import { getUnitOfMeasureDetailPageData } from "@/features/flooring/unit-of-measures/data/queries"
import { UnitOfMeasureDetailClient } from "@/features/flooring/unit-of-measures/record/detail/unit-of-measure-detail-client"

export default async function UnitOfMeasureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireUnitOfMeasuresAccess()
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getUnitOfMeasureDetailPageData(id)

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
    <UnitOfMeasureDetailClient
      unitOfMeasure={result.data}
      canManage={canEditUnitOfMeasures(user.role)}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/flooring/unit-of-measures")}
    />
  )
}
