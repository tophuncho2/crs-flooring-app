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
  const { controller, toggleActive, isTogglingActive, activeError } = useUserPrimarySection({
    page,
    entry,
  })
  const primary = controller.primarySection
  const record = controller.record

  const rankEditable = canEditRank(actorRank, record.rank)
  const isSelf = record.id === actorId
  // Mirrors the retired list-row gate: only ranks strictly below the actor, and
  // never deactivating your own still-active account.
  const canToggleActive = canEditRank(actorRank, record.rank) && !(record.isActive && isSelf)

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
            canToggleActive={canToggleActive}
            onToggleActive={() => void toggleActive()}
            isTogglingActive={isTogglingActive}
            activeError={activeError}
          />
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  return (
    <>
      <RecordMultiSectionPanel page={page} sections={sections} />
      {/* No delete — users are never removed through the UI (break-glass script only). */}
      <RecordEntityFooter onClose={page.closePage} />
    </>
  )
}
