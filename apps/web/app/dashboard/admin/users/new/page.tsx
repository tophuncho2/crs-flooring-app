import { canAccessAdminPanel, canManageUsers } from "@/server/auth/access-control"
import { requireSessionUser } from "@/server/auth/session"
import { redirect } from "next/navigation"
import { resolveRecordEntryReturnTo as resolveReturnTo } from "@/modules/shared/engines/common/record-entry"
import { AdminUserCreateClient } from "@/modules/admin/components/record/admin-user-create-client"

export default async function AdminUserCreatePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireSessionUser()

  if (!canAccessAdminPanel(user.email, user.role) || !canManageUsers(user.email, user.role)) {
    redirect("/dashboard/admin/users")
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined

  return (
    <AdminUserCreateClient
      backHref={resolveReturnTo(resolvedSearchParams?.returnTo, "/dashboard/admin/users")}
    />
  )
}
