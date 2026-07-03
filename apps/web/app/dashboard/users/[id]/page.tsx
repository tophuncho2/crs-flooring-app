import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import { notFound } from "next/navigation"
import { requireManageUsersAccess } from "@/server/auth/session"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/hooks/navigation"
import { getUserDetailPageData } from "@/modules/users/data/queries"
import { UserDetailClient } from "@/modules/users/components/record/user-detail-client"

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const actor = await requireManageUsersAccess()

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getUserDetailPageData(id)

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
    <UserDetailClient
      initialUser={result.data.user}
      actorRank={actor.rank}
      actorId={actor.id}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/users")}
    />
  )
}
