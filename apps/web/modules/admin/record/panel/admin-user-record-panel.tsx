"use client"

import {
  buildSingleSectionDeleteConfirmationMessage,
  RecordSingleSectionPanel,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { useAdminUserPrimarySection } from "./controllers/use-admin-user-primary-section"
import { AdminUserPrimaryFieldsSection } from "./sections/admin-user-primary-fields-section"
import type { ManagedUserRow } from "../../domain/types"

export function AdminUserRecordPanel({
  page,
  user,
  canManage,
}: {
  page: RecordDetailClientScaffoldContext
  user: ManagedUserRow
  canManage: boolean
}) {
  const controller = useAdminUserPrimarySection({ page, user })

  return (
    <RecordSingleSectionPanel
      title="User Details"
      controller={controller}
      canManage={canManage}
      showHeader={false}
      deleteConfirmationMessage={
        controller.record.canDelete
          ? buildSingleSectionDeleteConfirmationMessage({
              entityLabel: "user",
              description: "This will permanently delete this user. This action cannot be undone.",
            })
          : undefined
      }
    >
      <AdminUserPrimaryFieldsSection
        user={controller.record}
        draft={controller.primarySection.localValue}
        disabled={!canManage || controller.primarySection.isSaving}
        onChange={controller.primarySection.setLocalValue}
      />
    </RecordSingleSectionPanel>
  )
}
