"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/modules/shared/engines/record-view"
import { AdminUserRecordPanel } from "../panel/admin-user-record-panel"
import type { ManagedUserRow } from "../../domain/types"

export function AdminUserDetailClient({
  user,
  canManage,
  backHref,
}: {
  user: ManagedUserRow
  canManage: boolean
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={user.email}
      backHref={backHref}
      dirtyMessage="You have unsaved user changes. Leave without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <AdminUserRecordPanel page={page} user={user} canManage={canManage} />
      )}
    </RecordDetailClientScaffold>
  )
}
