import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getEntityDetailPageData } from "@/modules/entities/data/queries"
import { EntityDetailClient } from "@/modules/entities/components/record/entity-detail-client"

export default async function EntityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getEntityDetailPageData(id)

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
    <EntityDetailClient
      entity={result.data.entity}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/entities")}
    />
  )
}
