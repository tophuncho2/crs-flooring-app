import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireSessionUser } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getEntityTypeDetailPageData } from "@/modules/entity-types/data/queries"
import { EntityTypeDetailClient } from "@/modules/entity-types/components/record/entity-type-detail-client"

export default async function EntityTypeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireSessionUser()

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getEntityTypeDetailPageData(id)

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
    <EntityTypeDetailClient
      initialEntityType={result.data.entityType}
      previousEntityTypeId={result.data.previousEntityTypeId}
      nextEntityTypeId={result.data.nextEntityTypeId}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/entity-types")}
    />
  )
}
