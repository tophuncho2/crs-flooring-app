import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { canEditUnitOfMeasures } from "@/server/auth/access-control"
import { requireUnitOfMeasuresAccess } from "@/modules/shared/access/lookup-domains"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { getUnitOfMeasureDetailPageData } from "@/modules/unit-of-measures/data/queries"
import { UnitOfMeasureDetailClient } from "@/modules/unit-of-measures/record/detail/unit-of-measure-detail-client"

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
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/unit-of-measures")}
    />
  )
}
