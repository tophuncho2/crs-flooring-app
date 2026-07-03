"use client"

import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { UserRank } from "@builders/domain"
import { useInviteCreateSection } from "@/modules/invites/controllers/record/primary/use-invite-create-section"
import { InviteCreateFieldsSection } from "./primary/invite-create-fields-section"

function InviteCreatePanel({
  page,
  actorRank,
  loginUrl,
}: {
  page: RecordDetailClientScaffoldContext
  actorRank: UserRank
  loginUrl: string
}) {
  const controller = useInviteCreateSection({ page, actorRank, loginUrl })

  return (
    <RecordSingleSectionPanel
      title="New Invite"
      controller={controller}
      showHeader={false}
      saveLabel="Send invite"
      savingLabel="Sending..."
    >
      <InviteCreateFieldsSection
        draft={controller.primarySection.localValue}
        editable={!controller.primarySection.isSaving}
        actorRank={actorRank}
        onFieldChange={(field, value) =>
          controller.primarySection.setLocalValue((previous) => ({
            ...previous,
            [field]: value,
          }))
        }
      />
    </RecordSingleSectionPanel>
  )
}

export function InviteCreateClient({
  backHref,
  actorRank,
  loginUrl,
}: {
  backHref: string
  actorRank: UserRank
  loginUrl: string
}) {
  return (
    <RecordCreateClientScaffold
      title="New Invite"
      backHref={backHref}
      dirtyMessage="You have an unsent invite. Leave this form without sending?"
    >
      {(page) => <InviteCreatePanel page={page} actorRank={actorRank} loginUrl={loginUrl} />}
    </RecordCreateClientScaffold>
  )
}
