"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { Invite } from "@builders/domain"
import { InviteRecordPanel } from "./invite-record-panel"

export function InviteDetailClient({
  initialInvite,
  backHref,
}: {
  initialInvite: Invite
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="Invite"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="Leave this page?"
    >
      {(page) => <InviteRecordPanel page={page} invite={initialInvite} />}
    </RecordDetailClientScaffold>
  )
}
