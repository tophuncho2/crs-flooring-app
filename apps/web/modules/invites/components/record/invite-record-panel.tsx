"use client"

import {
  RecordEntityFooter,
  RecordFieldSection,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { Invite } from "@builders/domain"
import { useInvitePrimarySection } from "@/modules/invites/controllers/record/primary/use-invite-primary-section"
import { InvitePrimaryFieldsSection } from "./primary/invite-primary-fields-section"

export function InviteRecordPanel({
  page,
  invite,
}: {
  page: RecordDetailClientScaffoldContext
  invite: Invite
}) {
  const { error, revoke } = useInvitePrimarySection({ page, invite })

  return (
    <>
      <RecordFieldSection
        title="Invite"
        showHeader={false}
        isDirty={false}
        isSaving={false}
        hasConflict={false}
        error={error}
        onSave={() => {}}
        onDiscard={() => {}}
      >
        <InvitePrimaryFieldsSection invite={invite} />
      </RecordFieldSection>
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={revoke}
        deleteLabel="Revoke Invite"
        confirmTitle="Revoke this invite?"
        confirmMessage="The invitee will no longer be able to sign in with this invite."
      />
    </>
  )
}
