import { canAccessAdminPanel, canManageUsers } from "@/server/auth/access-control"
import { requireSessionUser } from "@/server/auth/session"
import { redirect } from "next/navigation"
import DashboardErrorState from "@/modules/app-shell/components/dashboard-error-state"
import AdminUsersClient from "@/modules/admin/components/list/admin-users-client"
import { getAdminUsersPageData } from "@/modules/admin/data/queries"
import { getResolvedUserTablePreference } from "@builders/application"
import { parseServerTableQueryState } from "@/server/pagination"

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireSessionUser()

  if (!canAccessAdminPanel(user.email, user.role)) {
    redirect("/dashboard/inventory")
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialTablePreferences = await getResolvedUserTablePreference(user.id, "admin-users-main")
  const tableState = parseServerTableQueryState({
    searchParams: resolvedSearchParams,
    defaultAscending: initialTablePreferences.hasSavedPreference ? initialTablePreferences.sort.direction === "asc" : true,
    defaultGrouped: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.enabled : false,
    defaultGroupKeys: initialTablePreferences.hasSavedPreference ? initialTablePreferences.grouping.keys : ["role"],
    allowedGroupKeys: ["role", "status"],
  })
  const pageData = await getAdminUsersPageData(user)

  if (!pageData.ok) {
    return (
      <DashboardErrorState
        title={pageData.error.title}
        message={pageData.error.message}
        detail={pageData.error.detail}
        errorCode={pageData.error.code}
      />
    )
  }

  return (
    <AdminUsersClient
      initialUsers={pageData.data.users}
      initialTablePreferences={initialTablePreferences}
      tableState={tableState}
      canManage={canManageUsers(user.email, user.role)}
    />
  )
}
