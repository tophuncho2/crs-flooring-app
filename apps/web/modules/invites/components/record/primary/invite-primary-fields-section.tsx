"use client"

import { CellAt, FieldSection, FormField, StaticFieldValue } from "@/engines/record-view"
import { formatEasternDateTime, type Invite } from "@builders/domain"
import { RANK_LABELS } from "@/modules/users/rank-presentation"

// Read-only invite detail. Invites carry no editable fields — the only mutation
// is Revoke (the record footer).
export function InvitePrimaryFieldsSection({ invite }: { invite: Invite }) {
  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={4}>
        <FormField label="Email">
          <StaticFieldValue>{invite.email}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Rank">
          <StaticFieldValue>{RANK_LABELS[invite.rank] ?? invite.rank}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Invited by">
          <StaticFieldValue>{invite.invitedBy ?? "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Expires">
          <StaticFieldValue>{formatEasternDateTime(invite.expiresAt) || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
