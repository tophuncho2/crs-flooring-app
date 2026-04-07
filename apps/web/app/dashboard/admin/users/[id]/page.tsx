import { canAccessAdminPanel, canManageUsers } from "@/server/auth/access-control"
import { requireSessionUser } from "@/server/auth/session"
import { redirect, notFound } from "next/navigation"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { getAdminUserDetailPageData } from "@/modules/admin/data/queries"
import { AdminUserDetailClient } from "@/modules/admin/record/detail/admin-user-detail-client"

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireSessionUser()

  if (!canAccessAdminPanel(user.email, user.role)) {
    redirect("/dashboard/inventory")
  }

  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const result = await getAdminUserDetailPageData(user, id)

  if (!result.ok) {
    if ("notFound" in result && result.notFound) {
      notFound()
    }
    notFound()
  }

  return (
    <AdminUserDetailClient
      user={result.data.user}
      canManage={canManageUsers(user.email, user.role)}
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/admin/users")}
    />
  )
}
