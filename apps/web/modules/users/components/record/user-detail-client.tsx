"use client"

import { RecordDetailClientScaffold } from "@/engines/record-view"
import type { User, UserRank } from "@builders/domain"
import { UserRecordPanel } from "./user-record-panel"

export function UserDetailClient({
  initialUser,
  actorRank,
  actorId,
  backHref,
}: {
  initialUser: User
  actorRank: UserRank
  actorId: string
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title="User"
      backHref={backHref}
      headerVariant="section"
      dirtyMessage="You have unsaved user changes. Leave this page without saving?"
    >
      {(page) => (
        <UserRecordPanel
          page={page}
          entry={initialUser}
          actorRank={actorRank}
          actorId={actorId}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
