"use client"

import {
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { User, UserRank } from "@builders/domain"
import { canEditRank } from "@/modules/users/rank-presentation"
import { useUserPrimarySection } from "@/modules/users/controllers/record/primary/use-user-primary-section"
import { UserPrimaryFieldsSection } from "./primary/user-primary-fields-section"

export function UserRecordPanel({
  page,
  entry,
  actorRank,
  actorId,
}: {
  page: RecordDetailClientScaffoldContext
  entry: User
  actorRank: UserRank
  actorId: string
}) {
  const controller = useUserPrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record

  const rankEditable = canEditRank(actorRank, record.rank)
  const isSelf = record.id === actorId
  // Delete is rank-scoped (strictly below the actor, so a DEVELOPER is
  // unreachable) and never allowed on your own account.
  const canDelete = rankEditable && !isSelf

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 10,
      dirtyLabel: "user",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="User"
          showHeader={false}
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
        >
          <UserPrimaryFieldsSection
            record={record}
            draft={primary.localValue}
            actorRank={actorRank}
            rankEditable={rankEditable}
            onRankChange={(rank) => primary.setLocalValue((previous) => ({ ...previous, rank }))}
            saving={primary.isSaving}
          />
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  return (
    <>
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={canDelete ? controller.deleteRecord : undefined}
        deleteLabel="Delete User"
        confirmTitle="Delete user?"
        confirmMessage="This permanently removes the user and revokes their sessions. They can be re-invited later. This cannot be undone."
      />
    </>
  )
}
